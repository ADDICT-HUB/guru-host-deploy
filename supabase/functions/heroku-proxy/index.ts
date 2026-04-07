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

    // Resolve API key
    let key = apiKey;
    if (!key && botId) {
      const { data: bot } = await supabase.from('bots').select('heroku_api_key_id').eq('id', botId).single();
      if (bot?.heroku_api_key_id) {
        const { data: keyRow } = await supabase.from('heroku_api_keys').select('api_key').eq('id', bot.heroku_api_key_id).single();
        key = keyRow?.api_key;
      }
    }
    if (!key) {
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
      case 'build-output': {
        const { buildId } = body;
        if (!buildId) {
          result = { output: 'No build ID available' };
          break;
        }
        // Get build result which includes output_stream_url
        const res = await fetch(`${HEROKU_API}/apps/${appName}/builds/${buildId}/result`, {
          headers: getHeaders(key),
        });
        if (res.ok) {
          const buildResult = await res.json();
          // Also get the build itself for output_stream_url
          const buildRes = await fetch(`${HEROKU_API}/apps/${appName}/builds/${buildId}`, {
            headers: getHeaders(key),
          });
          const buildData = await buildRes.json();
          
          let output = '';
          if (buildData.output_stream_url) {
            try {
              const streamRes = await fetch(buildData.output_stream_url);
              output = await streamRes.text();
            } catch {
              output = '';
            }
          }
          
          if (!output && buildResult.lines) {
            output = buildResult.lines.map((l: any) => `${l.stream}: ${l.line}`).join('');
          }
          
          result = { 
            output: output || 'No build output available', 
            status: buildData.status,
            buildpack_provided_description: buildData.buildpack_provided_description,
          };
        } else {
          result = { output: 'Failed to fetch build output' };
        }
        break;
      }
      case 'validate-key': {
        // Validate a Heroku API key by calling /account
        const testKey = body.testKey || key;
        try {
          const res = await fetch(`${HEROKU_API}/account`, {
            headers: getHeaders(testKey),
          });
          if (res.ok) {
            result = { valid: true };
          } else {
            result = { valid: false, status: res.status };
            // If this is the currently active key, mark it as expired
            if (!body.testKey) {
              await supabase.from('heroku_api_keys').update({ active: false }).eq('api_key', key);
              // Try to activate next available key
              const { data: nextKeys } = await supabase.from('heroku_api_keys').select('id, api_key').eq('active', false).neq('api_key', key).limit(5);
              if (nextKeys) {
                for (const nk of nextKeys) {
                  const checkRes = await fetch(`${HEROKU_API}/account`, { headers: getHeaders(nk.api_key) });
                  if (checkRes.ok) {
                    await supabase.from('heroku_api_keys').update({ active: true }).eq('id', nk.id);
                    result = { valid: false, status: res.status, switched_to: nk.id };
                    break;
                  }
                }
              }
            }
          }
        } catch (e) {
          result = { valid: false, error: e.message };
        }
        break;
      }
      case 'config-vars': {
        const res = await fetch(`${HEROKU_API}/apps/${appName}/config-vars`, {
          headers: getHeaders(key),
        });
        result = await res.json();
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
