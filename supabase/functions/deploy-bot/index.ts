import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HEROKU_API = 'https://api.heroku.com';
const GURU_MD_REPO = 'https://github.com/Gurulabstech/GURU-MD/tarball/main';
const DEPLOY_COST = 50;

function getHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/vnd.heroku+json; version=3',
    'Content-Type': 'application/json',
  };
}

function generateAppName(): string {
  const suffix = Math.random().toString(36).substring(2, 8);
  return `guru-md-${suffix}`.toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sessionId, region, userId } = await req.json();

    if (!sessionId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId or userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check user balance
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
    if (!profile || profile.balance < DEPLOY_COST) {
      return new Response(JSON.stringify({ error: 'Insufficient GRT balance' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get an active Heroku API key
    const { data: apiKeys } = await supabase.from('heroku_api_keys').select('*').eq('active', true).limit(1);
    if (!apiKeys || apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No Heroku API keys configured. Contact admin.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKeyRow = apiKeys[0];
    const herokuKey = apiKeyRow.api_key;
    const appName = generateAppName();

    // 1. Create Heroku app
    const createRes = await fetch(`${HEROKU_API}/apps`, {
      method: 'POST',
      headers: getHeaders(herokuKey),
      body: JSON.stringify({ name: appName, region: region || 'us', stack: 'heroku-24' }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      return new Response(JSON.stringify({ error: `Failed to create app: ${err.message || JSON.stringify(err)}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Set buildpacks
    await fetch(`${HEROKU_API}/apps/${appName}/buildpack-installations`, {
      method: 'PUT',
      headers: getHeaders(herokuKey),
      body: JSON.stringify({
        updates: [
          { buildpack: 'https://github.com/nicholasgasior/heroku-buildpack-ffmpeg.git', ordinal: 0 },
          { buildpack: 'heroku/nodejs', ordinal: 1 },
        ],
      }),
    });

    // 3. Set config vars
    await fetch(`${HEROKU_API}/apps/${appName}/config-vars`, {
      method: 'PATCH',
      headers: getHeaders(herokuKey),
      body: JSON.stringify({ SESSION_ID: sessionId }),
    });

    // 4. Create build from GitHub
    const buildRes = await fetch(`${HEROKU_API}/apps/${appName}/builds`, {
      method: 'POST',
      headers: getHeaders(herokuKey),
      body: JSON.stringify({
        source_blob: {
          url: GURU_MD_REPO,
          version: Date.now().toString(),
        },
      }),
    });

    const buildData = await buildRes.json();

    // 5. Deduct balance
    await supabase.rpc('add_balance', { user_id_input: userId, amount_input: -DEPLOY_COST });

    // 6. Save bot record
    await supabase.from('bots').insert({
      user_id: userId,
      app_name: appName,
      session_id: sessionId,
      status: 'deploying',
      heroku_api_key_id: apiKeyRow.id,
      build_id: buildData.id,
      region: region || 'us',
    });

    return new Response(JSON.stringify({ success: true, appName, buildId: buildData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
