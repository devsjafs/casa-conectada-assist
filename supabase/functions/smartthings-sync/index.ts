import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, userId } = await req.json();

    if (!token || !userId) {
      console.error('Missing token or userId');
      return new Response(
        JSON.stringify({ error: 'Token e userId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching SmartThings devices for user:', userId);

    // Fetch devices from SmartThings API
    const devicesResponse = await fetch('https://api.smartthings.com/v1/devices', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!devicesResponse.ok) {
      const errorText = await devicesResponse.text();
      console.error('SmartThings API error:', devicesResponse.status, errorText);
      
      if (devicesResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Token inválido ou expirado. Por favor, gere um novo token.' }),
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create or update integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .upsert({
        user_id: userId,
        type: 'smartthings',
        name: 'Samsung SmartThings',
        is_connected: true,
        access_token: token,
        metadata: { devices_count: devicesData.items?.length || 0 },
      }, {
        onConflict: 'user_id,type'
      })
      .select()
      .single();

    if (integrationError) {
      console.error('Error creating integration:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar integração' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Integration created/updated:', integration.id);

    // Map SmartThings device types to our types
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

    // Import devices
    let devicesImported = 0;
    const devices = devicesData.items || [];

    for (const stDevice of devices) {
      const deviceType = mapDeviceType(stDevice);
      
      const { error: deviceError } = await supabase
        .from('devices')
        .upsert({
          user_id: userId,
          integration_id: integration.id,
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
        }, {
          onConflict: 'user_id,external_id'
        });

      if (deviceError) {
        console.error('Error importing device:', stDevice.deviceId, deviceError);
      } else {
        devicesImported++;
        console.log('Device imported:', stDevice.label || stDevice.name);
      }
    }

    console.log('Total devices imported:', devicesImported);

    return new Response(
      JSON.stringify({ 
        success: true, 
        devicesImported,
        integrationId: integration.id 
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
