import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// RSS feed URLs for real Brazilian news
const RSS_FEEDS: Record<string, string[]> = {
  general: [
    "https://g1.globo.com/rss/g1/",
  ],
  sports: [
    "https://www.gazetaesportiva.com/feed/",
    "https://www.gazetaesportiva.com/futebol/futebol-internacional/feed/",
  ],
  tech: [
    "https://g1.globo.com/rss/g1/tecnologia/",
  ],
  entertainment: [
    "https://g1.globo.com/rss/g1/pop-arte/",
  ],
};

// Map team names to their Gazeta Esportiva RSS feed URLs
const TEAM_FEEDS: Record<string, string> = {
  "Flamengo": "https://www.gazetaesportiva.com/times/flamengo/feed/",
  "Corinthians": "https://www.gazetaesportiva.com/times/corinthians/feed/",
  "Palmeiras": "https://www.gazetaesportiva.com/times/palmeiras/feed/",
  "São Paulo": "https://www.gazetaesportiva.com/times/sao-paulo/feed/",
  "Vasco": "https://www.gazetaesportiva.com/times/vasco/feed/",
  "Botafogo": "https://www.gazetaesportiva.com/times/botafogo/feed/",
  "Fluminense": "https://www.gazetaesportiva.com/times/fluminense/feed/",
  "Grêmio": "https://www.gazetaesportiva.com/times/gremio/feed/",
  "Internacional": "https://www.gazetaesportiva.com/times/inter-rs/feed/",
  "Cruzeiro": "https://www.gazetaesportiva.com/times/cruzeiro/feed/",
  "Atlético-MG": "https://www.gazetaesportiva.com/times/atletico-mg/feed/",
  "Santos": "https://www.gazetaesportiva.com/times/santos/feed/",
  "Bahia": "https://www.gazetaesportiva.com/times/bahia/feed/",
  "Athletico-PR": "https://www.gazetaesportiva.com/times/atletico-pr/feed/",
};

interface RssItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  category: string;
}

// Simple XML tag content extractor
function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

// Parse RSS XML into items
function parseRss(xml: string, category: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
    const itemXml = match[1];
    const title = extractTag(itemXml, "title");
    const description = extractTag(itemXml, "description")
      .replace(/<[^>]*>/g, "") // strip HTML
      .substring(0, 200);
    const link = extractTag(itemXml, "link");
    const pubDate = extractTag(itemXml, "pubDate");
    
    if (title) {
      items.push({ title, description, link, pubDate, category });
    }
  }
  
  return items;
}

// Fetch and parse a single RSS feed
async function fetchFeed(url: string, category: string): Promise<RssItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.log(`RSS fetch failed for ${url}: ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    return parseRss(xml, category);
  } catch (e) {
    console.log(`RSS fetch error for ${url}:`, e instanceof Error ? e.message : e);
    return [];
  }
}

// Determine which feeds to fetch based on member preferences
function selectFeeds(preferences: any): { url: string; category: string }[] {
  const feeds: { url: string; category: string }[] = [];
  
  if (preferences) {
    if (preferences.sports?.length) {
      // Add team-specific feeds first
      for (const team of preferences.sports) {
        const teamUrl = TEAM_FEEDS[team];
        if (teamUrl) {
          feeds.push({ url: teamUrl, category: team });
        }
      }
      // Also add general sports feed
      RSS_FEEDS.sports.forEach(url => feeds.push({ url, category: "esportes" }));
    }
    if (preferences.music?.length || preferences.interests?.some((i: string) => 
      /música|entretenimento|show|cinema|filme|série|maquiagem|moda/i.test(i)
    )) {
      RSS_FEEDS.entertainment.forEach(url => feeds.push({ url, category: "entretenimento" }));
    }
    if (preferences.interests?.some((i: string) => /tecnologia|tech|games|jogos|programação|inteligência artificial/i.test(i))) {
      RSS_FEEDS.tech.forEach(url => feeds.push({ url, category: "tecnologia" }));
    }
    
    // Only add general if no specific feeds were matched
    if (feeds.length === 0) {
      RSS_FEEDS.general.forEach(url => feeds.push({ url, category: "geral" }));
    }
  } else {
    // No preferences at all = fetch everything
    RSS_FEEDS.general.forEach(url => feeds.push({ url, category: "geral" }));
    RSS_FEEDS.sports.forEach(url => feeds.push({ url, category: "esportes" }));
    RSS_FEEDS.entertainment.forEach(url => feeds.push({ url, category: "entretenimento" }));
    RSS_FEEDS.tech.forEach(url => feeds.push({ url, category: "tecnologia" }));
  }
  
  return feeds;
}

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

    // 1. Fetch real news from RSS feeds
    console.log("Fetching RSS feeds for preferences:", JSON.stringify(preferences));
    const feedsToFetch = selectFeeds(preferences);
    const feedResults = await Promise.all(
      feedsToFetch.map(f => fetchFeed(f.url, f.category))
    );
    
    const allNews = feedResults.flat();
    console.log(`Fetched ${allNews.length} news items total`);

    // RSS feeds already return recent content, so just use all items
    const recentNews = allNews.slice(0, 30);
    console.log(`Using ${recentNews.length} news items for AI selection`);

    const now = new Date();

    // 2. Build context for AI with REAL news data
    const newsContext = recentNews.slice(0, 30).map(item => 
      `[${item.category.toUpperCase()}] ${item.title} — ${item.description}`
    ).join("\n");

    // Build preferences text
    let preferencesText = "";
    if (preferences) {
      const parts = [];
      if (preferences.music?.length) parts.push(`Gêneros musicais: ${preferences.music.join(", ")}`);
      if (preferences.sports?.length) parts.push(`Times/esportes: ${preferences.sports.join(", ")}`);
      if (preferences.interests?.length) parts.push(`Interesses: ${preferences.interests.join(", ")}`);
      preferencesText = parts.join(". ");
    }

    const today = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const hour = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

    const systemPrompt = `Você é um assistente que seleciona e resume notícias REAIS para um feed personalizado.

REGRAS OBRIGATÓRIAS:
- Você DEVE selecionar notícias APENAS da lista de notícias reais fornecida abaixo
- NÃO invente notícias. Use SOMENTE as manchetes reais fornecidas
- Resuma cada notícia em título curto (max 60 chars) e descrição breve (max 120 chars)
- PRIORIDADE MÁXIMA: Se a pessoa tem preferências específicas (ex: um time de futebol), TODAS ou quase todas as notícias devem ser sobre esses interesses
- Se a pessoa só gosta de futebol/um time, dê 5 notícias de futebol, não misture com outros assuntos
- Se a pessoa tem poucos interesses, foque neles em vez de diversificar
- NÃO fale sobre economia de energia, automação ou configurações da casa
- Para cada notificação, escolha um tipo: info (geral), alert (urgente/importante), reminder (lembrete), task (ação)
- Use linguagem natural brasileira, como manchetes de portal de notícias`;

    const userPrompt = memberId && preferencesText
      ? `Selecione as 5 notícias mais relevantes para ${memberName}.
Preferências: ${preferencesText}.
Data: ${today}, ${hour}.

NOTÍCIAS REAIS DISPONÍVEIS:
${newsContext || "Nenhuma notícia disponível no momento."}

IMPORTANTE: ${memberName} tem interesse APENAS em: ${preferencesText}. 
Foque TODAS as 5 notícias nesses interesses. NÃO inclua notícias de assuntos que não estão nas preferências.
Se não houver 5 notícias dos interesses, complete com as que tiver, mas priorize os interesses.`
      : `Selecione as 5 notícias mais importantes e variadas para HOJE (${today}, ${hour}).

NOTÍCIAS REAIS DISPONÍVEIS:
${newsContext || "Nenhuma notícia disponível no momento."}

Escolha uma boa variedade: esportes, tecnologia, brasil, entretenimento, etc.`;

    console.log("Calling AI to select and format notifications...");

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
              description: "Create a list of personalized notifications based on real news",
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

    console.log(`AI selected ${notifications.length} notifications`);

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
