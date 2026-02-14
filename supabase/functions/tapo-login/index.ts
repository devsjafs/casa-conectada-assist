import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TPLINK_CLOUD_URL = 'https://wap.tplinkcloud.com';

async function tplinkCloudLogin(email: string, password: string): Promise<string> {
  const termId = crypto.randomUUID();
  const res = await fetch(TPLINK_CLOUD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'login',
      params: {
        appType: 'Kasa_Android',
        cloudUserName: email,
        cloudPassword: password,
        terminalUUID: termId,
      },
    }),
  });

  const data = await res.json();
  if (data.error_code !== 0 || !data.result?.token) {
    throw new Error('Login na nuvem TP-Link falhou. Verifique email e senha.');
  }
  return data.result.token;
}

async function tplinkGetDevices(token: string): Promise<any[]> {
  const res = await fetch(TPLINK_CLOUD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'getDeviceList',
    }),
  });

  // The token needs to be passed as query param for some endpoints
  const res2 = await fetch(`${TPLINK_CLOUD_URL}?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'getDeviceList',
    }),
  });

  const data = await res2.json();
  if (data.error_code !== 0) {
    throw new Error('Não foi possível listar dispositivos TP-Link.');
  }
  return data.result?.deviceList || [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password } = await req.json();
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Logging into TP-Link cloud for user:', user.id);

    // 1. Login to TP-Link cloud
    const token = await tplinkCloudLogin(email, password);
    console.log('TP-Link cloud login successful');

    // 2. Get device list
    const devices = await tplinkGetDevices(token);
    console.log(`Found ${devices.length} TP-Link devices`);

    // 3. Create/update integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .upsert({
        user_id: user.id,
        type: 'tapo' as any,
        name: 'TP-Link Tapo',
        is_connected: true,
        access_token: token,
        metadata: { email, device_count: devices.length },
      }, {
        onConflict: 'user_id,type',
      })
      .select()
      .single();

    if (integrationError) throw integrationError;

    // 4. Import devices (cameras and others)
    let imported = 0;
    for (const device of devices) {
      const deviceType = inferDeviceType(device.deviceType, device.deviceModel);
      
      const { data: dbDevice, error: deviceError } = await supabase
        .from('devices')
        .upsert({
          user_id: user.id,
          integration_id: integration.id,
          external_id: device.deviceId,
          name: device.alias || device.deviceName || `Tapo ${device.deviceModel}`,
          type: deviceType,
          is_on: device.status === 1,
          metadata: {
            model: device.deviceModel,
            device_type: device.deviceType,
            firmware: device.fwVer,
            mac: device.deviceMac,
            app_server_url: device.appServerUrl,
          },
        }, {
          onConflict: 'user_id,external_id',
        })
        .select()
        .single();

      if (deviceError) {
        console.error(`Error importing device ${device.alias}:`, deviceError);
        continue;
      }

      // If it's a camera, create camera entry
      if (deviceType === 'camera' && dbDevice) {
        await supabase
          .from('cameras')
          .upsert({
            device_id: dbDevice.id,
            status: device.status === 1 ? 'online' : 'offline',
          }, {
            onConflict: 'device_id',
          });
      }

      imported++;
    }

    console.log(`Imported ${imported}/${devices.length} devices`);

    return new Response(
      JSON.stringify({
        success: true,
        devices_found: devices.length,
        devices_imported: imported,
        devices: devices.map(d => ({
          name: d.alias || d.deviceName,
          model: d.deviceModel,
          type: inferDeviceType(d.deviceType, d.deviceModel),
          online: d.status === 1,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Tapo login error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao conectar com TP-Link' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function inferDeviceType(deviceType: string, model: string): string {
  const modelLower = (model || '').toLowerCase();
  const typeLower = (deviceType || '').toLowerCase();

  if (modelLower.startsWith('c') || typeLower.includes('camera') || typeLower.includes('ipcamera')) {
    return 'camera';
  }
  if (modelLower.startsWith('l') || typeLower.includes('bulb') || typeLower.includes('light')) {
    return 'light';
  }
  if (modelLower.startsWith('p') || typeLower.includes('plug') || typeLower.includes('switch')) {
    return 'switch';
  }
  if (typeLower.includes('fan')) return 'fan';
  return 'other';
}
