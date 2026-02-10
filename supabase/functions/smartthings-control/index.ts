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
    const basic = btoa(`${clientId}:${clientSecret}`);

    const response = await fetch('https://api.smartthings.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    const responseText = await response.text();
    console.log('Token refresh response:', response.status, responseText);

    if (!response.ok) {
      console.error('Token refresh failed:', response.status, responseText);
      return null;
    }

    const data = JSON.parse(responseText);
    const expiresAt = new Date(Date.now() + (data.expires_in || 86400) * 1000).toISOString();

    console.log('New tokens received:', {
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
      expiresIn: data.expires_in,
      atLen: data.access_token?.length,
      rtLen: data.refresh_token?.length,
    });

    await supabase
      .from('smartthings_connections')
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_at: expiresAt,
      })
      .eq('user_id', userId);

    console.log('Token refreshed and saved successfully');
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

  if (error || !conn) {
    console.error('No SmartThings connection found for user');
    return null;
  }

  // Check if token is expired or will expire in next 5 minutes
  const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : 0;
  const isExpired = Date.now() > expiresAt - 5 * 60 * 1000;

  if (isExpired && conn.refresh_token) {
    console.log('Token expired, refreshing...');
    return await refreshSmartThingsToken(supabase, userId, conn.refresh_token);
  }

  return conn.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { deviceId, command, userId } = await req.json();

    if (!deviceId || !command || !userId) {
      return new Response(
        JSON.stringify({ error: 'deviceId, command e userId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Control request:', { deviceId, command: command.type, userId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .eq('user_id', userId)
      .single();

    if (deviceError || !device) {
      console.error('Device not found:', deviceError);
      return new Response(
        JSON.stringify({ error: 'Dispositivo não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const smartthingsId = device.metadata?.smartthings_id || device.external_id;
    if (!smartthingsId) {
      return new Response(
        JSON.stringify({ error: 'Dispositivo não tem ID SmartThings' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get valid OAuth token
    let accessToken = await getValidToken(supabase, userId);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'SmartThings não está conectado. Por favor, reconecte a integração.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build SmartThings command
    let stCommands: any[] = [];

    switch (command.type) {
      case 'switch':
        stCommands = [{ capability: 'switch', command: command.value ? 'on' : 'off' }];
        break;
      case 'setTemperature':
        stCommands = [{
          capability: 'thermostatCoolingSetpoint',
          command: 'setCoolingSetpoint',
          arguments: [command.value],
        }];
        break;
      case 'setMode': {
        const modeMap: Record<string, string> = {
          cool: 'cool', heat: 'heat', auto: 'auto', dry: 'dry', fan: 'fanOnly',
        };
        stCommands = [{
          capability: 'airConditionerMode',
          command: 'setAirConditionerMode',
          arguments: [modeMap[command.value] || command.value],
        }];
        break;
      }
      case 'setFanSpeed': {
        const fanMap: Record<string, number> = { auto: 0, low: 1, medium: 2, high: 3 };
        stCommands = [{
          capability: 'airConditionerFanMode',
          command: 'setFanMode',
          arguments: [fanMap[command.value] ?? command.value],
        }];
        break;
      }
      default:
        return new Response(
          JSON.stringify({ error: 'Comando não suportado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Send command to SmartThings API
    const sendCommand = async (token: string) => {
      return fetch(`https://api.smartthings.com/v1/devices/${smartthingsId}/commands`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commands: stCommands.map((cmd) => ({ component: 'main', ...cmd })),
        }),
      });
    };

    let response = await sendCommand(accessToken);

    // If 401, try refreshing token once
    if (response.status === 401) {
      console.log('Got 401, attempting token refresh...');
      const { data: conn } = await supabase
        .from('smartthings_connections')
        .select('refresh_token')
        .eq('user_id', userId)
        .single();

      if (conn?.refresh_token) {
        const newToken = await refreshSmartThingsToken(supabase, userId, conn.refresh_token);
        if (newToken) {
          accessToken = newToken;
          response = await sendCommand(newToken);
        }
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SmartThings API error:', response.status, errorText);

      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Token SmartThings expirado. Por favor, reconecte a integração.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Erro ao enviar comando para o dispositivo' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('Command sent successfully');

    // Update device state in database
    const updates: any = { updated_at: new Date().toISOString() };
    if (command.type === 'switch') updates.is_on = command.value;
    else if (command.type === 'setTemperature') updates.settings = { ...device.settings, temperature: command.value };
    else if (command.type === 'setMode') updates.settings = { ...device.settings, mode: command.value };
    else if (command.type === 'setFanSpeed') updates.settings = { ...device.settings, fanSpeed: command.value };

    await supabase.from('devices').update(updates).eq('id', deviceId);

    return new Response(
      JSON.stringify({ success: true, result }),
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
