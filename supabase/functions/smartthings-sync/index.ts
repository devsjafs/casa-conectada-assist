import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Refresh SmartThings OAuth token
async function refreshSmartThingsToken(
  supabase: any,
  userId: string,
  refreshToken: string
): Promise<string | null> {
  const clientId = Deno.env.get('SMARTTHINGS_CLIENT_ID')!;
  const clientSecret = Deno.env.get('SMARTTHINGS_CLIENT_SECRET')!;

  try {
    const response = await fetch('https://auth-global.api.smartthings.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', response.status);
      return null;
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + (data.expires_in || 86400) * 1000).toISOString();

    await supabase
      .from('smartthings_connections')
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_at: expiresAt,
      })
      .eq('user_id', userId);

    return data.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

// Get a valid access token, refreshing if needed
async function getValidToken(supabase: any, userId: string): Promise<string | null> {
  const { data: conn, error } = await supabase
    .from('smartthings_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single();

  if (error || !conn) return null;

  const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : 0;
  const isExpired = Date.now() > expiresAt - 5 * 60 * 1000;

  if (isExpired && conn.refresh_token) {
    return await refreshSmartThingsToken(supabase, userId, conn.refresh_token);
  }

  return conn.access_token;
}

const mapDeviceType = (stDevice: any): string => {
  const categories = stDevice.components?.[0]?.categories || [];
  const categoryNames = categories.map((c: any) => c.name?.toLowerCase() || '');

  if (categoryNames.includes('light') || categoryNames.includes('switch')) return 'light';
  if (categoryNames.includes('camera')) return 'camera';
  if (categoryNames.includes('airconditioner') || categoryNames.includes('thermostat')) return 'ac';
  if (categoryNames.includes('television') || categoryNames.includes('tv')) return 'tv';
  if (categoryNames.includes('fan')) return 'fan';
  if (categoryNames.includes('speaker')) return 'soundbar';
  if (categoryNames.includes('sensor') || categoryNames.includes('motionsensor')) return 'sensor';
  return 'switch';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Syncing SmartThings devices for user:', userId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get valid OAuth token
    const accessToken = await getValidToken(supabase, userId);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'SmartThings não está conectado. Por favor, conecte sua conta.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch devices from SmartThings API
    const devicesResponse = await fetch('https://api.smartthings.com/v1/devices', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!devicesResponse.ok) {
      const errorText = await devicesResponse.text();
      console.error('SmartThings API error:', devicesResponse.status, errorText);

      if (devicesResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Token expirado. Por favor, reconecte o SmartThings.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Erro ao buscar dispositivos do SmartThings' }),
        { status: devicesResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const devicesData = await devicesResponse.json();
    console.log('SmartThings devices found:', devicesData.items?.length || 0);

    // Ensure integration exists
    const { data: integration } = await supabase
      .from('integrations')
      .upsert(
        {
          user_id: userId,
          type: 'smartthings',
          name: 'Samsung SmartThings',
          is_connected: true,
          metadata: { devices_count: devicesData.items?.length || 0 },
        },
        { onConflict: 'user_id,type' }
      )
      .select()
      .single();

    // Import devices
    let devicesImported = 0;
    const devices = devicesData.items || [];

    for (const stDevice of devices) {
      const deviceType = mapDeviceType(stDevice);

      const { error: deviceError } = await supabase.from('devices').upsert(
        {
          user_id: userId,
          integration_id: integration?.id,
          external_id: stDevice.deviceId,
          name: stDevice.label || stDevice.name || 'Dispositivo SmartThings',
          type: deviceType,
          is_on: false,
          metadata: {
            smartthings_id: stDevice.deviceId,
            manufacturer: stDevice.manufacturerName,
            model: stDevice.deviceManufacturerCode,
            categories: stDevice.components?.[0]?.categories || [],
          },
        },
        { onConflict: 'user_id,external_id' }
      );

      if (!deviceError) devicesImported++;
      else console.error('Error importing device:', stDevice.deviceId, deviceError);
    }

    console.log('Total devices imported:', devicesImported);

    return new Response(
      JSON.stringify({
        success: true,
        devicesImported,
        integrationId: integration?.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
