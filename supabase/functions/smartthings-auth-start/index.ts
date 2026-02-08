import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Create HMAC-signed state parameter to securely pass user_id through OAuth flow
async function createState(userId: string, redirectUrl: string, secret: string): Promise<string> {
  const data = JSON.stringify({ userId, redirectUrl, ts: Date.now() });
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return btoa(data) + '.' + sigB64;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const clientId = Deno.env.get('SMARTTHINGS_CLIENT_ID');
    
    if (!clientId) {
      console.error('SMARTTHINGS_CLIENT_ID not configured');
      return new Response(
        JSON.stringify({ error: 'SmartThings não está configurado. Client ID ausente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    console.log('Starting SmartThings OAuth for user:', user.id);

    // Get redirect URL from request body (where to return after OAuth)
    let redirectUrl = 'https://casa-conectada-assist.lovable.app';
    try {
      const body = await req.json();
      if (body.redirectUrl) redirectUrl = body.redirectUrl;
    } catch {
      // No body, use default
    }

    // Create signed state
    const state = await createState(user.id, redirectUrl, serviceRoleKey);

    // Build SmartThings authorization URL
    const callbackUrl = `${supabaseUrl}/functions/v1/smartthings-auth-callback`;
    const scopes = 'r:devices:* x:devices:* r:locations:*';

    const authUrl = new URL('https://api.smartthings.com/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);

    console.log('OAuth URL generated, redirecting to SmartThings');

    return new Response(
      JSON.stringify({ url: authUrl.toString() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Auth start error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao iniciar autenticação SmartThings' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
