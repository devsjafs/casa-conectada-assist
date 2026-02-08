import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify HMAC-signed state parameter
async function verifyState(state: string, secret: string): Promise<{ userId: string; redirectUrl: string } | null> {
  try {
    const parts = state.split(".");
    if (parts.length !== 2) return null;

    const [dataB64, sigB64] = parts;
    const data = atob(dataB64);

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
      "verify",
    ]);

    const sig = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sig, encoder.encode(data));
    if (!valid) return null;

    const parsed = JSON.parse(data);
    // State valid for 15 minutes
    if (Date.now() - parsed.ts > 15 * 60 * 1000) return null;

    return { userId: parsed.userId, redirectUrl: parsed.redirectUrl };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // IMPORTANT: do not force `!` here; we want clean error handling if missing.
  const clientId = Deno.env.get("SMARTTHINGS_CLIENT_ID");
  const clientSecret = Deno.env.get("SMARTTHINGS_CLIENT_SECRET");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  let redirectUrl = "https://casa-conectada-assist.lovable.app";

  try {
    // Handle OAuth errors from SmartThings
    if (oauthError) {
      console.error("SmartThings OAuth error:", oauthError);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${redirectUrl}?smartthings=error&message=${encodeURIComponent(oauthError)}`,
        },
      });
    }

    if (!code || !state) {
      console.error("Missing code or state", { hasCode: !!code, hasState: !!state });
      return new Response(null, {
        status: 302,
        headers: { Location: `${redirectUrl}?smartthings=error&message=missing_params` },
      });
    }

    // Verify state
    const stateData = await verifyState(state, serviceRoleKey);
    if (!stateData) {
      console.error("Invalid or expired state");
      return new Response(null, {
        status: 302,
        headers: { Location: `${redirectUrl}?smartthings=error&message=invalid_state` },
      });
    }

    const { userId } = stateData;
    if (stateData.redirectUrl) redirectUrl = stateData.redirectUrl;

    console.log("OAuth callback for user:", userId);

    // Ensure client credentials exist
    if (!clientId || !clientSecret) {
      console.error("Missing SmartThings OAuth env vars", {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
      });
      return new Response(null, {
        status: 302,
        headers: { Location: `${redirectUrl}?smartthings=error&message=missing_client_credentials` },
      });
    }

    // Exchange code for tokens (SmartThings expects client authentication via Basic Auth)
    const callbackUrl = `${supabaseUrl}/functions/v1/smartthings-auth-callback`;
    const basic = btoa(`${clientId}:${clientSecret}`);

    const tokenResponse = await fetch("https://auth-global.api.smartthings.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Token exchange failed:", tokenResponse.status, errText);
      return new Response(null, {
        status: 302,
        headers: { Location: `${redirectUrl}?smartthings=error&message=token_exchange_failed` },
      });
    }

    const tokenData = await tokenResponse.json();
    console.log("Tokens received successfully", {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      hasInstalledAppId: !!tokenData.installed_app_id,
    });

    // Calculate expiry
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 86400) * 1000).toISOString();

    // Save tokens in smartthings_connections using service role
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error: upsertError } = await supabase.from("smartthings_connections").upsert(
      {
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        installed_app_id: tokenData.installed_app_id || null,
      },
      { onConflict: "user_id" },
    );

    if (upsertError) {
      console.error("Error saving tokens:", upsertError);
      return new Response(null, {
        status: 302,
        headers: { Location: `${redirectUrl}?smartthings=error&message=save_failed` },
      });
    }

    // Also update integrations table to mark as connected
    await supabase.from("integrations").upsert(
      {
        user_id: userId,
        type: "smartthings",
        name: "Samsung SmartThings",
        is_connected: true,
      },
      { onConflict: "user_id,type" },
    );

    // Sync devices using the new token (non-fatal if it fails)
    try {
      const devicesResponse = await fetch("https://api.smartthings.com/v1/devices", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (devicesResponse.ok) {
        const devicesData = await devicesResponse.json();
        const devices = devicesData.items || [];
        console.log("Syncing", devices.length, "devices");

        // Get integration ID
        const { data: integration } = await supabase
          .from("integrations")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "smartthings")
          .single();

        const integrationId = integration?.id;

        for (const stDevice of devices) {
          const deviceType = mapDeviceType(stDevice);
          await supabase.from("devices").upsert(
            {
              user_id: userId,
              integration_id: integrationId,
              external_id: stDevice.deviceId,
              name: stDevice.label || stDevice.name || "Dispositivo SmartThings",
              type: deviceType,
              is_on: false,
              metadata: {
                smartthings_id: stDevice.deviceId,
                manufacturer: stDevice.manufacturerName,
                model: stDevice.deviceManufacturerCode,
                categories: stDevice.components?.[0]?.categories || [],
              },
            },
            { onConflict: "user_id,external_id" },
          );
        }

        // Update device count in integrations
        await supabase
          .from("integrations")
          .update({ metadata: { devices_count: devices.length } })
          .eq("user_id", userId)
          .eq("type", "smartthings");

        console.log("Device sync completed:", devices.length, "devices");
      } else {
        const body = await devicesResponse.text();
        console.error("Devices list failed:", devicesResponse.status, body);
      }
    } catch (syncError) {
      console.error("Device sync error (non-fatal):", syncError);
    }

    console.log("SmartThings OAuth completed successfully");
    return new Response(null, {
      status: 302,
      headers: { Location: `${redirectUrl}?smartthings=connected` },
    });
  } catch (err) {
    console.error("Callback error:", err);
    return new Response(null, {
      status: 302,
      headers: { Location: `${redirectUrl}?smartthings=error&message=unexpected_error` },
    });
  }
});

// Map SmartThings device categories to our device types
function mapDeviceType(stDevice: any): string {
  const categories = stDevice.components?.[0]?.categories || [];
  const categoryNames = categories.map((c: any) => c.name?.toLowerCase() || "");

  if (categoryNames.includes("light") || categoryNames.includes("switch")) return "light";
  if (categoryNames.includes("camera")) return "camera";
  if (categoryNames.includes("airconditioner") || categoryNames.includes("thermostat")) return "ac";
  if (categoryNames.includes("television") || categoryNames.includes("tv")) return "tv";
  if (categoryNames.includes("fan")) return "fan";
  if (categoryNames.includes("speaker")) return "soundbar";
  if (categoryNames.includes("sensor") || categoryNames.includes("motionsensor")) return "sensor";

  return "switch";
}
