import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { deviceId, command, userId } = await req.json();

    if (!deviceId || !command || !userId) {
      return new Response(
        JSON.stringify({ error: 'deviceId, command e userId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Control request:', { deviceId, command, userId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get device with its integration
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*, integrations(access_token)')
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
    const accessToken = device.integrations?.access_token;

    if (!smartthingsId || !accessToken) {
      console.error('Missing SmartThings ID or token');
      return new Response(
        JSON.stringify({ error: 'Dispositivo não tem configuração SmartThings válida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending command to SmartThings device:', smartthingsId);

    // Build SmartThings command based on our command type
    let stCommands: any[] = [];

    switch (command.type) {
      case 'switch':
        stCommands = [{
          capability: 'switch',
          command: command.value ? 'on' : 'off'
        }];
        break;

      case 'setTemperature':
        // For AC, we use airConditionerMode and thermostatCoolingSetpoint
        stCommands = [{
          capability: 'thermostatCoolingSetpoint',
          command: 'setCoolingSetpoint',
          arguments: [command.value]
        }];
        break;

      case 'setMode':
        // Map our modes to SmartThings modes
        const modeMap: Record<string, string> = {
          'cool': 'cool',
          'heat': 'heat',
          'auto': 'auto',
          'dry': 'dry',
          'fan': 'fanOnly'
        };
        stCommands = [{
          capability: 'airConditionerMode',
          command: 'setAirConditionerMode',
          arguments: [modeMap[command.value] || command.value]
        }];
        break;

      case 'setFanSpeed':
        // Map fan speeds
        const fanMap: Record<string, number> = {
          'auto': 0,
          'low': 1,
          'medium': 2,
          'high': 3
        };
        stCommands = [{
          capability: 'airConditionerFanMode',
          command: 'setFanMode',
          arguments: [fanMap[command.value] ?? command.value]
        }];
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Comando não suportado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Send command to SmartThings API
    const response = await fetch(
      `https://api.smartthings.com/v1/devices/${smartthingsId}/commands`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commands: stCommands.map(cmd => ({
            component: 'main',
            ...cmd
          }))
        }),
      }
    );

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
        JSON.stringify({ error: 'Erro ao enviar comando para o dispositivo', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('SmartThings command result:', result);

    // Update device state in database
    const updates: any = { updated_at: new Date().toISOString() };
    
    if (command.type === 'switch') {
      updates.is_on = command.value;
    } else if (command.type === 'setTemperature') {
      updates.settings = { ...device.settings, temperature: command.value };
    } else if (command.type === 'setMode') {
      updates.settings = { ...device.settings, mode: command.value };
    } else if (command.type === 'setFanSpeed') {
      updates.settings = { ...device.settings, fanSpeed: command.value };
    }

    await supabase
      .from('devices')
      .update(updates)
      .eq('id', deviceId);

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
