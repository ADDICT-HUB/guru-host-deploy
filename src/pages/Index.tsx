import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

function generateAppName(): string {
  const suffix = Math.random().toString(36).substring(2, 8);
  return `guru-md-${suffix}`.toLowerCase();
}

// 🔥 NEW: Specifically look for Silvateam14
async function findSilvateam14(apiKey: string, supabase: any, apiKeyId: string) {
  try {
    console.log('🔍 Looking specifically for team: Silvateam14');
    
    // Method 1: Check teams endpoint
    const teamsRes = await fetch(`${HEROKU_API}/teams`, {
      headers: getHeaders(apiKey),
    });
    
    if (teamsRes.ok) {
      const teams = await teamsRes.json();
      console.log('📋 Available teams:', teams.map((t: any) => t.name));
      
      // Look for Silvateam14 specifically
      const silvaTeam = teams.find((t: any) => 
        t.name === 'Silvateam14' || 
        t.name.toLowerCase() === 'silvateam14'
      );
      
      if (silvaTeam) {
        console.log('✅ Found Silvateam14!');
        
        // Store in database
        await supabase
          .from('heroku_api_keys')
          .update({ 
            team_name: silvaTeam.name,
            team_id: silvaTeam.id,
            account_type: 'team',
            team_detected: true,
            is_silvateam: true
          })
          .eq('id', apiKeyId);
        
        return silvaTeam.name;
      }
    }
    
    // Method 2: Check organizations
    const orgsRes = await fetch(`${HEROKU_API}/organizations`, {
      headers: getHeaders(apiKey),
    });
    
    if (orgsRes.ok) {
      const orgs = await orgsRes.json();
      const silvaOrg = orgs.find((o: any) => 
        o.name === 'Silvateam14' || 
        o.name.toLowerCase() === 'silvateam14'
      );
      
      if (silvaOrg) {
        console.log('✅ Found Silvateam14 as organization');
        
        await supabase
          .from('heroku_api_keys')
          .update({ 
            team_name: silvaOrg.name,
            account_type: 'organization',
            team_detected: true,
            is_silvateam: true
          })
          .eq('id', apiKeyId);
        
        return silvaOrg.name;
      }
    }
    
    console.log('❌ Silvateam14 not found in available teams');
    return null;
    
  } catch (error) {
    console.error('❌ Error finding Silvateam14:', error);
    return null;
  }
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
      return new Response(JSON.stringify({ error: 'Missing sessionId or userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is banned
    const { data: profile } = await supabase.from('profiles').select('balance, banned').eq('id', userId).single();
    if (!profile) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (profile.banned) {
      return new Response(JSON.stringify({ error: 'Your account has been banned. Contact admin.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get deploy cost from settings
    const { data: costSetting } = await supabase.from('platform_settings').select('value').eq('key', 'deploy_cost').single();
    const deployCost = costSetting ? parseInt(costSetting.value) : 50;

    if (profile.balance < deployCost) {
      return new Response(JSON.stringify({ error: 'Insufficient GRT balance' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    // 🔥 FIXED: First try to find a key that already has Silvateam14
    let { data: apiKeys } = await supabase
      .from('heroku_api_keys')
      .select('*')
      .eq('active', true)
      .eq('team_name', 'Silvateam14')
      .limit(1);
      
    // If no key with Silvateam14 found, get any active key and try to detect
    if (!apiKeys || apiKeys.length === 0) {
      console.log('🔄 No key with Silvateam14 found, checking available keys...');
      
      const { data: allKeys } = await supabase
        .from('heroku_api_keys')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!allKeys || allKeys.length === 0) {
        return new Response(JSON.stringify({ error: 'No Heroku API keys configured. Contact admin.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Try each key to find Silvateam14
      for (const key of allKeys) {
        console.log(`🔑 Checking key: ${key.label}`);
        const teamName = await findSilvateam14(key.api_key, supabase, key.id);
        
        if (teamName) {
          apiKeys = [key];
          break;
        }
      }
      
      // If still no Silvateam14, use first key
      if (!apiKeys || apiKeys.length === 0) {
        console.log('⚠️ Silvateam14 not found, using first available key');
        apiKeys = [allKeys[0]];
      }
    }

    const selectedKey = apiKeys[0];
    
    // 🔥 Get team name - prioritize Silvateam14
    let herokuTeam = selectedKey.team_name;
    
    // If this key doesn't have a team yet, try to find Silvateam14 specifically
    if (!herokuTeam) {
      console.log('🔄 Attempting to find Silvateam14 with this key...');
      herokuTeam = await findSilvateam14(selectedKey.api_key, supabase, selectedKey.id);
    }
    
    // If still no team, check if it's Silvateam14 already stored
    if (!herokuTeam && selectedKey.is_silvateam) {
      herokuTeam = 'Silvateam14';
    }

    const appName = generateAppName();

    // 🔥 Build app creation payload
    const createBody: any = { 
      name: appName, 
      region: region || 'us', 
      stack: 'heroku-24'
    };

    // Add team if available - PRIORITIZE Silvateam14
    if (herokuTeam) {
      createBody.team = herokuTeam;
      console.log(`🚀 Creating app in team: ${herokuTeam}`);
    } else {
      console.log('⚠️ No team found - app will be created in personal account');
    }

    // 1. Create Heroku app
    const createRes = await fetch(`${HEROKU_API}/apps`, {
      method: 'POST',
      headers: getHeaders(selectedKey.api_key),
      body: JSON.stringify(createBody),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      
      if (createRes.status === 402 || createRes.status === 403 || err.message?.includes('verify')) {
        
        // Mark this key as requiring verification
        await supabase
          .from('heroku_api_keys')
          .update({ 
            needs_verification: true,
            last_error: err.message,
            active: false
          })
          .eq('id', selectedKey.id);
        
        return new Response(JSON.stringify({ 
          error: 'Payment verification required. Looking for Silvateam14 team account...',
          details: err.message,
          fix: 'Make sure the API key belongs to a member of the Silvateam14 team'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: `Failed to create app: ${err.message || JSON.stringify(err)}`,
        herokuError: err 
      }), {
        status: createRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appData = await createRes.json();

    // 2. Set buildpacks
    const buildpackRes = await fetch(`${HEROKU_API}/apps/${appName}/buildpack-installations`, {
      method: 'PUT',
      headers: getHeaders(selectedKey.api_key),
      body: JSON.stringify({
        updates: [
          { buildpack: 'https://github.com/nicholasgasior/heroku-buildpack-ffmpeg.git', ordinal: 0 },
          { buildpack: 'heroku/nodejs', ordinal: 1 },
        ],
      }),
    });

    if (!buildpackRes.ok) {
      const err = await buildpackRes.json();
      return new Response(JSON.stringify({ 
        error: `Failed to set buildpacks: ${err.message || JSON.stringify(err)}`,
        herokuError: err 
      }), {
        status: buildpackRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Set config vars
    const configVars: Record<string, string> = {
      [sessionVarName]: sessionId,
      ...(customVars || {}),
    };

    const configRes = await fetch(`${HEROKU_API}/apps/${appName}/config-vars`, {
      method: 'PATCH',
      headers: getHeaders(selectedKey.api_key),
      body: JSON.stringify(configVars),
    });

    if (!configRes.ok) {
      const err = await configRes.json();
      return new Response(JSON.stringify({ 
        error: `Failed to set config vars: ${err.message || JSON.stringify(err)}`,
        herokuError: err 
      }), {
        status: configRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Create build
    const buildRes = await fetch(`${HEROKU_API}/apps/${appName}/builds`, {
      method: 'POST',
      headers: getHeaders(selectedKey.api_key),
      body: JSON.stringify({
        source_blob: {
          url: repoUrl,
          version: Date.now().toString(),
        },
      }),
    });

    if (!buildRes.ok) {
      const err = await buildRes.json();
      return new Response(JSON.stringify({ 
        error: `Failed to create build: ${err.message || JSON.stringify(err)}`,
        herokuError: err 
      }), {
        status: buildRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const buildData = await buildRes.json();

    // 5. Deduct balance
    await supabase.rpc('add_balance', { user_id_input: userId, amount_input: -deployCost });

    // 6. Update API key app count
    await supabase
      .from('heroku_api_keys')
      .update({ current_apps: (selectedKey.current_apps || 0) + 1 })
      .eq('id', selectedKey.id);

    // 7. Save bot record
    await supabase.from('bots').insert({
      user_id: userId,
      app_name: appName,
      session_id: sessionId,
      status: 'deploying',
      heroku_api_key_id: selectedKey.id,
      build_id: buildData.id,
      region: region || 'us',
      repo_id: resolvedRepoId || null,
      custom_vars: customVars || {},
    });

    return new Response(JSON.stringify({ 
      success: true, 
      appName, 
      buildId: buildData.id,
      team: herokuTeam || 'personal',
      message: herokuTeam === 'Silvateam14' ? '🚀 Deployed with Silvateam14!' : 'Deployed successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('🔥 Deployment error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
