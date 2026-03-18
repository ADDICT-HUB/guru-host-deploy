import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const HEROKU_API = 'https://api.heroku.com';
const DEFAULT_REPO = 'https://github.com/Gurulabstech/GURU-MD';

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

/** Convert a GitHub URL to tarball format for Heroku source builds */
function toTarballUrl(url: string): string {
  // Already a tarball URL
  if (/\/tarball\//.test(url)) return url;
  // Strip trailing slash and .git
  let clean = url.replace(/\/+$/, '').replace(/\.git$/, '');
  // Standard GitHub repo URL → tarball
  const match = clean.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)$/);
  if (match) {
    return `https://github.com/${match[1]}/${match[2]}/tarball/main`;
  }
  // If it's some other format, return as-is and let Heroku handle it
  return url;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sessionId, region, userId, repoId, repoUrl, sessionVarName, customVars } = await req.json();

    if (!sessionId || !userId) {
      return json({ error: 'Missing sessionId or userId' });
    }

    // Check if user is banned
    const { data: profile } = await supabase.from('profiles').select('balance, banned, referred_by').eq('id', userId).single();
    if (!profile) return json({ error: 'User not found' });
    if (profile.banned) return json({ error: 'Your account has been banned. Contact admin.' });

    // Get deploy cost
    const { data: costSetting } = await supabase.from('platform_settings').select('value').eq('key', 'deploy_cost').single();
    const deployCost = costSetting ? parseInt(costSetting.value) : 50;

    if (profile.balance < deployCost) {
      return json({ error: 'Insufficient GRT balance' });
    }

    // Resolve repo URL and session var name
    let finalRepoUrl: string;
    let finalSessionVarName = sessionVarName || 'SESSION_ID';

    if (repoUrl) {
      // User provided a custom repo URL — convert to tarball
      finalRepoUrl = toTarballUrl(repoUrl);
    } else if (repoId) {
      // Legacy: lookup from bot_repos table
      const { data: repo } = await supabase.from('bot_repos').select('*').eq('id', repoId).single();
      if (repo) {
        finalRepoUrl = repo.repo_url;
        finalSessionVarName = repo.session_var_name || 'SESSION_ID';
      } else {
        finalRepoUrl = toTarballUrl(DEFAULT_REPO);
      }
    } else {
      finalRepoUrl = toTarballUrl(DEFAULT_REPO);
    }

    // Get an active Heroku API key
    const { data: apiKeys } = await supabase.from('heroku_api_keys').select('*').eq('active', true).limit(1);
    if (!apiKeys || apiKeys.length === 0) {
      return json({ error: 'No Heroku API keys configured. Contact admin.' });
    }

    const apiKeyRow = apiKeys[0];
    const herokuKey = apiKeyRow.api_key;
    const appName = generateAppName();

    // Detect team for this API key
    let teamName: string | null = null;
    try {
      const teamsRes = await fetch(`${HEROKU_API}/teams`, { headers: getHeaders(herokuKey) });
      if (teamsRes.ok) {
        const teams = await teamsRes.json();
        if (Array.isArray(teams) && teams.length > 0) {
          const silva = teams.find((t: any) => t.name.toLowerCase() === 'silvateam14');
          teamName = silva ? silva.name : teams[0].name;
        }
      }
    } catch { /* continue without team */ }

    // Build create payload & endpoint
    const createBody: any = { name: appName, region: region || 'us', stack: 'heroku-24' };
    let createUrl = `${HEROKU_API}/apps`;
    if (teamName) {
      createUrl = `${HEROKU_API}/teams/apps`;
      createBody.team = teamName;
      console.log(`🚀 Creating app in team: ${teamName}`);
    }

    // 1. Create Heroku app
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: getHeaders(herokuKey),
      body: JSON.stringify(createBody),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      return json({ error: `Failed to create app: ${err.message || JSON.stringify(err)}` });
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
    const configVars: Record<string, string> = {
      [finalSessionVarName]: sessionId,
      ...(customVars || {}),
    };

    await fetch(`${HEROKU_API}/apps/${appName}/config-vars`, {
      method: 'PATCH',
      headers: getHeaders(herokuKey),
      body: JSON.stringify(configVars),
    });

    // 4. Create build from tarball
    console.log(`📦 Building from: ${finalRepoUrl}`);
    const buildRes = await fetch(`${HEROKU_API}/apps/${appName}/builds`, {
      method: 'POST',
      headers: getHeaders(herokuKey),
      body: JSON.stringify({
        source_blob: { url: finalRepoUrl, version: Date.now().toString() },
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
      repo_url: repoUrl || DEFAULT_REPO,
      custom_vars: customVars || {},
    });

    // 7. Process referral reward (first deploy only)
    try {
      const { count: botCount } = await supabase.from('bots').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      if (botCount === 1 && profile.referred_by) {
        const { data: rewardSetting } = await supabase.from('platform_settings').select('value').eq('key', 'referral_reward').single();
        const rewardAmount = rewardSetting ? parseInt(rewardSetting.value) : 20;
        await supabase.rpc('add_balance', { user_id_input: profile.referred_by, amount_input: rewardAmount });
        await supabase.from('referrals')
          .update({ status: 'completed', referred_id: userId, completed_at: new Date().toISOString() })
          .eq('referrer_id', profile.referred_by)
          .eq('status', 'pending')
          .limit(1);
      }
    } catch (e) {
      console.error('Referral processing error:', e);
    }

    return json({
      success: true,
      appName,
      buildId: buildData.id,
      team: teamName || 'personal',
    });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
});
