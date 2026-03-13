import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, appName, apiKey } = await req.json();

    // Get API key from request or from database
    const key = apiKey;
    if (!key) {
      return new Response(JSON.stringify({ error: 'No Heroku API key provided' }), {
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
        // Get log session
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
        const { buildId } = await req.json().catch(() => ({}));
        const res = await fetch(`${HEROKU_API}/apps/${appName}/builds/${buildId}`, {
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
