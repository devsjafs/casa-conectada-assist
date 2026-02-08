import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { memberId, userId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let preferences: any = null;
    let memberName = "Geral";

    if (memberId) {
      const { data: member } = await supabase
        .from("household_members")
        .select("name, preferences")
        .eq("id", memberId)
        .single();

      if (member) {
        memberName = member.name;
        preferences = member.preferences;
      }
    }

    // Build the prompt based on preferences
    let preferencesText = "";
    if (preferences) {
      const parts = [];
      if (preferences.music?.length) parts.push(`Gêneros musicais: ${preferences.music.join(", ")}`);
      if (preferences.sports?.length) parts.push(`Times/esportes: ${preferences.sports.join(", ")}`);
      if (preferences.interests?.length) parts.push(`Interesses: ${preferences.interests.join(", ")}`);
      preferencesText = parts.join(". ");
    }

    const now = new Date();
    const today = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const hour = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

    const systemPrompt = `Você é um assistente de casa inteligente que funciona como um feed de notícias personalizado e ATUALIZADO.
DADOS TEMPORAIS OBRIGATÓRIOS:
- Data de HOJE: ${today}
- Hora atual (Brasília): ${hour}
- Ano atual: ${now.getFullYear()}

Gere exatamente 5 notificações que pareçam NOTÍCIAS FRESCAS DE HOJE.

REGRAS CRÍTICAS:
- TODAS as notícias devem ser contextualizadas como acontecendo HOJE (${today}) ou nesta semana
- Use verbos no presente ou passado recente: "anuncia", "confirmou hoje", "acaba de", "nesta manhã", "nesta tarde"
- NÃO use datas genéricas ou antigas. Referencie sempre "hoje", "agora", "nesta semana", "amanhã"
- NÃO fale sobre economia de energia, dicas de automação ou configurações da casa
- Foque em temas ATUAIS e REALISTAS: esportes, música, entretenimento, tecnologia, clima, cultura
- Se a pessoa gosta de um time de futebol, crie notícias verossímeis sobre esse time HOJE (próximo jogo, treino, escalação)
- Se gosta de música, fale sobre lançamentos recentes, shows desta semana
- Cada notificação deve parecer uma manchete de portal de notícias atualizado AGORA
- Seja criativo mas VEROSSÍMIL - não invente resultados absurdos
Para cada notificação, escolha um tipo entre: info, alert, reminder, task.`;

    const userPrompt = memberId && preferencesText
      ? `Gere 5 notícias FRESQUINHAS de HOJE (${today}, ${hour}) personalizadas para ${memberName}. 
Preferências: ${preferencesText}. 
IMPORTANTE: Todas devem parecer notícias que acabaram de ser publicadas AGORA. Use "hoje", "nesta tarde", "há pouco" nos textos.
NÃO inclua nada sobre casa inteligente, energia ou automação.`
      : `Gere 5 notificações úteis e ATUAIS para AGORA (${today}, ${hour} em Brasília). 
Inclua: previsão do tempo para HOJE, uma notícia importante do Brasil de HOJE, uma curiosidade interessante, um lembrete de bem-estar para este momento do dia, e uma notícia de tecnologia recente.
TODAS devem parecer publicadas AGORA. Use "hoje", "nesta tarde", "nesta manhã" nos textos.
NÃO fale sobre economia de energia ou automação residencial.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_notifications",
              description: "Create a list of personalized notifications",
              parameters: {
                type: "object",
                properties: {
                  notifications: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short title (max 60 chars)" },
                        message: { type: "string", description: "Brief description (max 120 chars)" },
                        type: { type: "string", enum: ["info", "alert", "reminder", "task"] },
                      },
                      required: ["title", "message", "type"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["notifications"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_notifications" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call response from AI");
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const notifications = parsed.notifications || [];

    // Delete old AI-generated notifications for this member/user
    if (memberId) {
      await supabase
        .from("notifications")
        .delete()
        .eq("user_id", userId)
        .eq("member_id", memberId);
    } else {
      await supabase
        .from("notifications")
        .delete()
        .eq("user_id", userId)
        .is("member_id", null);
    }

    // Insert new notifications
    const inserts = notifications.map((n: any) => ({
      user_id: userId,
      member_id: memberId || null,
      title: n.title,
      message: n.message,
      type: n.type,
      is_read: false,
    }));

    if (inserts.length > 0) {
      await supabase.from("notifications").insert(inserts);
    }

    return new Response(JSON.stringify({ success: true, count: inserts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-notifications error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
