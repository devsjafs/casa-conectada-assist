import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const lifecycle = body.lifecycle;

    console.log('SmartThings webhook received lifecycle:', lifecycle);

    switch (lifecycle) {
      case 'PING': {
        const challenge = body.pingData?.challenge;
        console.log('PING received, echoing challenge');
        return new Response(
          JSON.stringify({
            statusCode: 200,
            pingData: { challenge },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'CONFIRMATION': {
        const confirmationUrl = body.confirmationData?.confirmationUrl;
        if (confirmationUrl) {
          console.log('CONFIRMATION: fetching confirmation URL');
          await fetch(confirmationUrl);
        }
        return new Response(
          JSON.stringify({ statusCode: 200 }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'CONFIGURATION': {
        const phase = body.configurationData?.phase;
        console.log('CONFIGURATION phase:', phase);

        if (phase === 'INITIALIZE') {
          return new Response(
            JSON.stringify({
              statusCode: 200,
              configurationData: {
                initialize: {
                  name: 'Casa Conectada',
                  description: 'Smart Home Control - Casa Conectada',
                  id: 'casa-conectada-app',
                  permissions: ['r:devices:*', 'x:devices:*', 'r:locations:*'],
                  firstPageId: '1',
                },
              },
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (phase === 'PAGE') {
          return new Response(
            JSON.stringify({
              statusCode: 200,
              configurationData: {
                page: {
                  pageId: '1',
                  name: 'Configuração',
                  nextPageId: null,
                  previousPageId: null,
                  complete: true,
                  sections: [],
                },
              },
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ statusCode: 200 }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'INSTALL': {
        console.log('INSTALL received');
        const installData = body.installData;
        const installedAppId = installData?.installedApp?.installedAppId;
        const locationId = installData?.installedApp?.locationId;
        console.log('Installed app:', installedAppId, 'location:', locationId);
        // Tokens from INSTALL lifecycle are handled separately via OAuth flow
        return new Response(
          JSON.stringify({ statusCode: 200, installData: {} }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'UPDATE': {
        console.log('UPDATE received');
        return new Response(
          JSON.stringify({ statusCode: 200, updateData: {} }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'UNINSTALL': {
        console.log('UNINSTALL received');
        return new Response(
          JSON.stringify({ statusCode: 200, uninstallData: {} }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'EVENT': {
        console.log('EVENT received, events count:', body.eventData?.events?.length || 0);
        return new Response(
          JSON.stringify({ statusCode: 200, eventData: {} }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default: {
        console.log('Unknown lifecycle:', lifecycle);
        return new Response(
          JSON.stringify({ statusCode: 200 }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
