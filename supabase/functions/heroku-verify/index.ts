import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const HEROKU_API = 'https://api.heroku.com';

function h(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/vnd.heroku+json; version=3',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return json({ valid: false, error: 'API key required' });
    }

    // 1. Get account info
    const accountRes = await fetch(`${HEROKU_API}/account`, { headers: h(apiKey) });
    if (!accountRes.ok) {
      return json({ valid: false, error: 'Invalid API key — could not authenticate with Heroku' });
    }
    const account = await accountRes.json();

    // 2. Get teams (orgs) the key belongs to
    const teamsRes = await fetch(`${HEROKU_API}/teams`, { headers: h(apiKey) });
    let accountType = 'personal';
    const teams: { name: string; role: string; type: string; credit: string }[] = [];

    if (teamsRes.ok) {
      const teamsData = await teamsRes.json();
      if (Array.isArray(teamsData) && teamsData.length > 0) {
        accountType = 'team';
        for (const t of teamsData) {
          // Get team billing/invoice info
          let credit = 'N/A';
          try {
            const invoiceRes = await fetch(`${HEROKU_API}/teams/${t.name}/invoices`, { headers: h(apiKey) });
            if (invoiceRes.ok) {
              const invoices = await invoiceRes.json();
              if (Array.isArray(invoices) && invoices.length > 0) {
                const latest = invoices[0];
                credit = `$${(latest.total / 100).toFixed(2)} (${latest.state || 'current'})`;
              }
            }
          } catch { /* ignore billing errors */ }
          
          teams.push({
            name: t.name,
            role: t.role || t.membership?.role || 'member',
            type: t.type || 'team',
            credit,
          });
        }
      }
    }

    // 3. Count apps (for personal or team)
    const appsRes = await fetch(`${HEROKU_API}/apps`, { headers: h(apiKey) });
    let appCount = 0;
    let appNames: string[] = [];
    if (appsRes.ok) {
      const apps = await appsRes.json();
      if (Array.isArray(apps)) {
        appCount = apps.length;
        appNames = apps.slice(0, 10).map((a: any) => a.name);
      }
    }

    // 4. Check remaining dyno hours (for free/eco plans)
    let dynoQuota: any = null;
    try {
      const quotaRes = await fetch(`${HEROKU_API}/account/rate-limits`, { headers: h(apiKey) });
      if (quotaRes.ok) {
        dynoQuota = await quotaRes.json();
      }
    } catch { /* ignore */ }

    // 5. Check account features (e.g. preboot, labs)
    let verified = false;
    try {
      verified = !!account.verified;
    } catch { /* ignore */ }

    return json({
      valid: true,
      email: account.email,
      name: account.name || account.email?.split('@')[0],
      accountType,
      verified,
      teams,
      appCount,
      appNames,
      dynoQuota,
      region: account.default_region || 'us',
      createdAt: account.created_at,
    });
  } catch (error) {
    return json({ valid: false, error: error.message }, 500);
  }
});
