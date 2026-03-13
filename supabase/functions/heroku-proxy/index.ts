import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const HEROKU_API = 'https://api.heroku.com';

function getHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/vnd.heroku+json; version=3',
    'Content-Type': 'application/json',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, appName, apiKey, botId } = body;

    // Resolve API key: use provided key, or look up from bot's linked heroku_api_key_id
    let key = apiKey;
    if (!key && botId) {
      const { data: bot } = await supabase.from('bots').select('heroku_api_key_id').eq('id', botId).single();
      if (bot?.heroku_api_key_id) {
        const { data: keyRow } = await supabase.from('heroku_api_keys').select('api_key').eq('id', bot.heroku_api_key_id).single();
        key = keyRow?.api_key;
      }
    }
    if (!key) {
      // Fallback: grab any active key
      const { data: keys } = await supabase.from('heroku_api_keys').select('api_key').eq('active', true).limit(1);
      if (keys && keys.length > 0) key = keys[0].api_key;
    }
    if (!key) {
      return new Response(JSON.stringify({ error: 'No Heroku API key available' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result;

    switch (action) {
      case 'restart': {
        const res = await fetch(`${HEROKU_API}/apps/${appName}/dynos`, {
          method: 'DELETE',
          headers: getHeaders(key),
        });
        result = await res.json();
        break;
      }
      case 'delete': {
        const res = await fetch(`${HEROKU_API}/apps/${appName}`, {
          method: 'DELETE',
          headers: getHeaders(key),
        });
        result = await res.json();
        break;
      }
      case 'logs': {
        const res = await fetch(`${HEROKU_API}/apps/${appName}/log-sessions`, {
          method: 'POST',
          headers: getHeaders(key),
          body: JSON.stringify({ lines: 100, tail: false }),
        });
        const session = await res.json();
        if (session.logplex_url) {
          const logsRes = await fetch(session.logplex_url);
          const logs = await logsRes.text();
          result = { logs };
        } else {
          result = { logs: 'Unable to fetch logs' };
        }
        break;
      }
      case 'dynos': {
        const res = await fetch(`${HEROKU_API}/apps/${appName}/dynos`, {
          headers: getHeaders(key),
        });
        result = await res.json();
        break;
      }
      case 'info': {
        const res = await fetch(`${HEROKU_API}/apps/${appName}`, {
          headers: getHeaders(key),
        });
        result = await res.json();
        break;
      }
      case 'build-status': {
        const { buildId } = body;
        if (!buildId) {
          result = { error: 'buildId required' };
          break;
        }
        const res = await fetch(`${HEROKU_API}/apps/${appName}/builds/${buildId}`, {
          headers: getHeaders(key),
        });
        const buildData = await res.json();
        result = buildData;

        // Auto-update bot status in DB if build succeeded or failed
        if (botId && buildData.status) {
          let newStatus: string | null = null;
          if (buildData.status === 'succeeded') newStatus = 'active';
          else if (buildData.status === 'failed') newStatus = 'crashed';

          if (newStatus) {
            await supabase.from('bots').update({ status: newStatus }).eq('id', botId);
          }
        }
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
