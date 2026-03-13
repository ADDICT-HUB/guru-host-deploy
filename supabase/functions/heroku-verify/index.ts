import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HEROKU_API = 'https://api.heroku.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to get account info
    const accountRes = await fetch(`${HEROKU_API}/account`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/vnd.heroku+json; version=3',
      },
    });

    if (!accountRes.ok) {
      return new Response(JSON.stringify({ valid: false, error: 'Invalid API key' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const account = await accountRes.json();

    // Check if it's a team account by listing teams
    const teamsRes = await fetch(`${HEROKU_API}/teams`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/vnd.heroku+json; version=3',
      },
    });

    let accountType = 'personal';
    let teams: string[] = [];

    if (teamsRes.ok) {
      const teamsData = await teamsRes.json();
      if (Array.isArray(teamsData) && teamsData.length > 0) {
        accountType = 'team';
        teams = teamsData.map((t: any) => t.name);
      }
    }

    // Count existing apps
    const appsRes = await fetch(`${HEROKU_API}/apps`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/vnd.heroku+json; version=3',
      },
    });
    
    let appCount = 0;
    if (appsRes.ok) {
      const apps = await appsRes.json();
      appCount = Array.isArray(apps) ? apps.length : 0;
    }

    return new Response(JSON.stringify({
      valid: true,
      email: account.email,
      accountType,
      teams,
      appCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
