import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Rocket, Loader2, AlertCircle, Plus, Trash2, Wallet, Copy, Share2, Gift, Zap, HelpCircle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const DEFAULT_REPO = 'https://github.com/Gurulabstech/GURU-MD';

export default function DeployBot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState('');
  const [repoUrl, setRepoUrl] = useState(DEFAULT_REPO);
  const [sessionVarName, setSessionVarName] = useState('SESSION_ID');
  const [region, setRegion] = useState('us');
  const [balance, setBalance] = useState(0);
  const [deployCost, setDeployCost] = useState(50);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [customVars, setCustomVars] = useState<{ key: string; value: string }[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [detectingVar, setDetectingVar] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);

  // Auto-detect session var name from README when repo URL changes
  useEffect(() => {
    const detectSessionVar = async () => {
      if (!repoUrl.trim() || !repoUrl.includes('github.com')) {
        return;
      }
      // Extract owner/repo from GitHub URL
      const match = repoUrl.replace(/\.git$/, '').replace(/\/+$/, '').match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) return;

      setDetectingVar(true);
      setAutoDetected(false);
      try {
        const res = await fetch(`https://api.github.com/repos/${match[1]}/${match[2]}/readme`, {
          headers: { Accept: 'application/vnd.github.v3.raw' },
        });
        if (!res.ok) throw new Error('No README');
        const readme = await res.text();

        // Common patterns for session var names in WhatsApp bot READMEs
        const patterns = [
          /SESSION_ID/i,
          /SESSION/i,
          /BOT_SESSION/i,
          /WA_SESSION/i,
          /AUTH_SESSION/i,
          /QUEEN_SESSION/i,
          /SILVA_SESSION/i,
          /GURU_SESSION/i,
        ];

        // Look for env var declarations like SESSION_ID= or `SESSION_ID` or SESSION_ID in config
        const envVarPattern = /\b([A-Z_]*SESSION[A-Z_]*)\b/g;
        const found = new Set<string>();
        let m;
        while ((m = envVarPattern.exec(readme)) !== null) {
          found.add(m[1]);
        }

        if (found.size > 0) {
          // Prefer exact match order
          const priority = ['SESSION_ID', 'SESSION', 'BOT_SESSION', 'WA_SESSION'];
          const detected = priority.find(p => found.has(p)) || [...found][0];
          setSessionVarName(detected);
          setAutoDetected(true);
        }
      } catch {
        // Silently fail — user can still manually set
      } finally {
        setDetectingVar(false);
      }
    };

    const timeout = setTimeout(detectSessionVar, 800); // debounce
    return () => clearTimeout(timeout);
  }, [repoUrl]);

  useEffect(() => {
    if (user) {
      Promise.all([
        supabase.from('profiles').select('balance, referral_code').eq('id', user.id).single(),
        supabase.from('platform_settings').select('*').eq('key', 'deploy_cost').single(),
        supabase.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', user.id).eq('status', 'completed'),
      ]).then(([profileRes, costRes, refRes]) => {
        setBalance(profileRes.data?.balance || 0);
        setReferralCode(profileRes.data?.referral_code || '');
        if (costRes.data) setDeployCost(parseInt(costRes.data.value) || 50);
        setReferralCount(refRes.count || 0);
        setFetching(false);
      });
    }
  }, [user]);

  const generateReferralCode = async () => {
    if (!user) return;
    const code = `GURU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await supabase.from('profiles').update({ referral_code: code }).eq('id', user.id);
    setReferralCode(code);
    toast({ title: 'Referral code generated!', description: code });
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Copied!', description: 'Referral link copied to clipboard' });
  };

  const addVar = () => setCustomVars([...customVars, { key: '', value: '' }]);
  const removeVar = (i: number) => setCustomVars(customVars.filter((_, idx) => idx !== i));
  const updateVar = (i: number, field: 'key' | 'value', val: string) => {
    const updated = [...customVars];
    updated[i][field] = val;
    setCustomVars(updated);
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId.trim()) {
      toast({ title: 'Session ID required', variant: 'destructive' });
      return;
    }
    if (!repoUrl.trim()) {
      toast({ title: 'Repository URL required', variant: 'destructive' });
      return;
    }
    if (balance < deployCost) {
      toast({ title: 'Insufficient GRT', description: `You need ${deployCost} GRT. Current: ${balance} GRT`, variant: 'destructive' });
      return;
    }

    const extraVars: Record<string, string> = {};
    customVars.forEach(v => { if (v.key.trim()) extraVars[v.key.trim()] = v.value; });

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('deploy-bot', {
        body: {
          sessionId: sessionId.trim(),
          repoUrl: repoUrl.trim(),
          sessionVarName: sessionVarName.trim() || 'SESSION_ID',
          region,
          userId: user?.id,
          customVars: extraVars,
        },
      });

      if (error) {
        let message = error.message;
        try {
          const ctx = error.context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            message = body?.error || message;
          }
        } catch {}
        toast({ title: 'Deployment failed', description: message, variant: 'destructive' });
      } else if (data?.error) {
        toast({ title: 'Deployment failed', description: data.error, variant: 'destructive' });
      } else {
        toast({ title: '🚀 Bot Deployed!', description: `${data?.appName} is being built...` });
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast({ title: 'Deployment failed', description: err?.message || 'Unknown error', variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Deploy WhatsApp Bot</h1>
          <p className="text-muted-foreground">Deploy any WhatsApp bot MD repo — just like Heroku</p>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link to="/dashboard/fund">
            <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-3 text-center">
                <Wallet className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-xs font-medium">Fund Account</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/dashboard">
            <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-3 text-center">
                <Zap className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-xs font-medium">My Bots</p>
              </CardContent>
            </Card>
          </Link>
          <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={referralCode ? copyReferralLink : generateReferralCode}>
            <CardContent className="p-3 text-center">
              <Gift className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xs font-medium">Refer & Earn</p>
            </CardContent>
          </Card>
          <a href="https://github.com/Gurulabstech/GURU-MD" target="_blank" rel="noopener noreferrer">
            <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-3 text-center">
                <HelpCircle className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-xs font-medium">Get Session</p>
              </CardContent>
            </Card>
          </a>
        </div>

        {/* New User Guide */}
        <Collapsible open={guideOpen} onOpenChange={setGuideOpen}>
          <Card className="bg-card border-primary/20">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-secondary/30 transition-colors rounded-t-lg">
                <CardTitle className="font-display flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    How to Deploy Your Bot (Step-by-Step)
                  </span>
                  {guideOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
                    <div>
                      <p className="font-medium text-foreground">Get your Session ID</p>
                      <p className="text-muted-foreground">Visit <a href="https://github.com/Gurulabstech/GURU-MD" target="_blank" rel="noopener noreferrer" className="text-primary underline">GURU-MD GitHub</a> or your bot's repo and follow their session ID instructions. This pairs the bot with your WhatsApp number.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</span>
                    <div>
                      <p className="font-medium text-foreground">Choose a Bot Repository</p>
                      <p className="text-muted-foreground">Paste any public GitHub bot repo URL below. Default is <span className="font-mono text-xs">GURU-MD</span>. You can deploy any WhatsApp MD bot — just like Heroku.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</span>
                    <div>
                      <p className="font-medium text-foreground">Set Session Var Name</p>
                      <p className="text-muted-foreground">Most bots use <span className="font-mono text-xs">SESSION_ID</span>. Some use <span className="font-mono text-xs">SESSION</span> or others — check your bot's README.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">4</span>
                    <div>
                      <p className="font-medium text-foreground">Fund & Deploy</p>
                      <p className="text-muted-foreground">Make sure you have enough GRT balance, then hit <strong>Deploy Bot</strong>. Your bot will be live in ~2 minutes!</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
                  <strong className="text-foreground">💡 Tips:</strong> Add custom env vars if your bot needs extra config (API keys, prefixes, etc). Choose the region closest to you for best performance.
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><Rocket className="w-5 h-5 text-primary" /> New Deployment</CardTitle>
            <CardDescription>Cost: {deployCost} GRT • Paste any GitHub repo URL</CardDescription>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <form onSubmit={handleDeploy} className="space-y-5">
                <div className="p-3 rounded-lg bg-secondary/50 border border-border flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Your Balance</span>
                  <span className={`font-display font-bold text-lg ${balance >= deployCost ? 'text-primary' : 'text-destructive'}`}>{balance} GRT</span>
                </div>

                {balance < deployCost && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Insufficient balance.
                    <Link to="/dashboard/fund" className="underline font-medium">Fund now</Link>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="repoUrl">GitHub Repository URL</Label>
                  <Input
                    id="repoUrl"
                    placeholder="https://github.com/user/bot-repo"
                    value={repoUrl}
                    onChange={e => setRepoUrl(e.target.value)}
                    required
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Any public GitHub repo with a valid <span className="font-mono">package.json</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session">Session ID</Label>
                  <Input
                    id="session"
                    placeholder="Paste your bot session ID"
                    value={sessionId}
                    onChange={e => setSessionId(e.target.value)}
                    required
                    className="font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sessionVar">Session Var Name</Label>
                    <Input
                      id="sessionVar"
                      placeholder="SESSION_ID"
                      value={sessionVarName}
                      onChange={e => setSessionVarName(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Region</Label>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us">🇺🇸 United States</SelectItem>
                        <SelectItem value="eu">🇪🇺 Europe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Custom Vars */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Custom Environment Variables</Label>
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addVar}>
                      <Plus className="w-3 h-3" /> Add Var
                    </Button>
                  </div>
                  {customVars.length > 0 && (
                    <div className="space-y-2">
                      {customVars.map((v, i) => (
                        <div key={i} className="flex gap-2">
                          <Input placeholder="KEY" value={v.key} onChange={e => updateVar(i, 'key', e.target.value)} className="font-mono text-xs" />
                          <Input placeholder="value" value={v.value} onChange={e => updateVar(i, 'value', e.target.value)} className="font-mono text-xs" />
                          <Button type="button" variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => removeVar(i)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full gap-2" disabled={loading || balance < deployCost}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  Deploy Bot ({deployCost} GRT)
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Referral Card */}
        <Card className="bg-card border-primary/20">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-base"><Gift className="w-5 h-5 text-primary" /> Refer & Earn GRT</CardTitle>
            <CardDescription>Earn 20 GRT for every friend who deploys a bot using your link!</CardDescription>
          </CardHeader>
          <CardContent>
            {referralCode ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input readOnly value={`${window.location.origin}?ref=${referralCode}`} className="font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={copyReferralLink}><Copy className="w-4 h-4" /></Button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Successful referrals</span>
                  <span className="font-bold text-primary">{referralCount} • {referralCount * 20} GRT earned</span>
                </div>
              </div>
            ) : (
              <Button onClick={generateReferralCode} className="gap-2"><Share2 className="w-4 h-4" /> Generate Referral Link</Button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
