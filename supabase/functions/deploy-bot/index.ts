import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const HEROKU_API = 'https://api.heroku.com';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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

    const { sessionId, region, userId, repoId, customVars } = await req.json();

    if (!sessionId || !userId) {
      return json({ error: 'Missing sessionId or userId' });
    }

    // Check if user is banned
    const { data: profile } = await supabase.from('profiles').select('balance, banned').eq('id', userId).single();
    if (!profile) {
      return json({ error: 'User not found' });
    }
    if (profile.banned) {
      return json({ error: 'Your account has been banned. Contact admin.' });
    }

    // Get deploy cost from settings
    const { data: costSetting } = await supabase.from('platform_settings').select('value').eq('key', 'deploy_cost').single();
    const deployCost = costSetting ? parseInt(costSetting.value) : 50;

    if (profile.balance < deployCost) {
      return json({ error: 'Insufficient GRT balance' });
    }

    // Get bot repo info
    let repoUrl = 'https://github.com/Gurulabstech/GURU-MD/tarball/main';
    let sessionVarName = 'SESSION_ID';
    let resolvedRepoId = repoId;

    if (repoId) {
      const { data: repo } = await supabase.from('bot_repos').select('*').eq('id', repoId).single();
      if (repo) {
        repoUrl = repo.repo_url;
        sessionVarName = repo.session_var_name || 'SESSION_ID';
      }
    }

    // Get an active Heroku API key
    const { data: apiKeys } = await supabase.from('heroku_api_keys').select('*').eq('active', true).limit(1);
    if (!apiKeys || apiKeys.length === 0) {
      return json({ error: 'No Heroku API keys configured. Contact admin.' });
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
      return json({ error: `Failed to create app: ${err.message || JSON.stringify(err)}` });
    }

    // 2. Set buildpacks
    const buildpackRes = await fetch(`${HEROKU_API}/apps/${appName}/buildpack-installations`, {
      method: 'PUT',
      headers: getHeaders(herokuKey),
      body: JSON.stringify({
        updates: [
          { buildpack: 'https://github.com/nicholasgasior/heroku-buildpack-ffmpeg.git', ordinal: 0 },
          { buildpack: 'heroku/nodejs', ordinal: 1 },
        ],
      }),
    });

    if (!buildpackRes.ok) {
      const err = await buildpackRes.json();
      return json({ error: `Failed to set buildpacks: ${err.message || JSON.stringify(err)}` });
    }

    // 3. Set config vars (session + custom vars)
    const configVars: Record<string, string> = {
      [sessionVarName]: sessionId,
      ...(customVars || {}),
    };

    const configRes = await fetch(`${HEROKU_API}/apps/${appName}/config-vars`, {
      method: 'PATCH',
      headers: getHeaders(herokuKey),
      body: JSON.stringify(configVars),
    });

    if (!configRes.ok) {
      const err = await configRes.json();
      return json({ error: `Failed to set config vars: ${err.message || JSON.stringify(err)}` });
    }

    // 4. Create build from GitHub
    const buildRes = await fetch(`${HEROKU_API}/apps/${appName}/builds`, {
      method: 'POST',
      headers: getHeaders(herokuKey),
      body: JSON.stringify({
        source_blob: {
          url: repoUrl,
          version: Date.now().toString(),
        },
      }),
    });

    if (!buildRes.ok) {
      const err = await buildRes.json();
      return json({ error: `Failed to create build: ${err.message || JSON.stringify(err)}` });
    }

    const buildData = await buildRes.json();

    // 5. Deduct balance
    await supabase.rpc('add_balance', { user_id_input: userId, amount_input: -deployCost });

    // 6. Save bot record
    await supabase.from('bots').insert({
      user_id: userId,
      app_name: appName,
      session_id: sessionId,
      status: 'deploying',
      heroku_api_key_id: apiKeyRow.id,
      build_id: buildData.id,
      region: region || 'us',
      repo_id: resolvedRepoId || null,
      custom_vars: customVars || {},
    });

    return json({ success: true, appName, buildId: buildData.id });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
});
