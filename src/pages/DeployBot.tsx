import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Rocket, Loader2, AlertCircle, Plus, Trash2 } from 'lucide-react';

export default function DeployBot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState('');
  const [region, setRegion] = useState('us');
  const [balance, setBalance] = useState(0);
  const [deployCost, setDeployCost] = useState(50);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [customVars, setCustomVars] = useState<{ key: string; value: string }[]>([]);

  useEffect(() => {
    if (user) {
      Promise.all([
        supabase.from('profiles').select('balance').eq('id', user.id).single(),
        supabase.from('bot_repos').select('*').eq('active', true),
        supabase.from('platform_settings').select('*').eq('key', 'deploy_cost').single(),
      ]).then(([profileRes, reposRes, costRes]) => {
        setBalance(profileRes.data?.balance || 0);
        setRepos(reposRes.data || []);
        if (reposRes.data && reposRes.data.length > 0) setSelectedRepo(reposRes.data[0].id);
        if (costRes.data) setDeployCost(parseInt(costRes.data.value) || 50);
        setFetching(false);
      });
    }
  }, [user]);

  const addVar = () => setCustomVars([...customVars, { key: '', value: '' }]);
  const removeVar = (i: number) => setCustomVars(customVars.filter((_, idx) => idx !== i));
  const updateVar = (i: number, field: 'key' | 'value', val: string) => {
    const updated = [...customVars];
    updated[i][field] = val;
    setCustomVars(updated);
  };

  const selectedRepoData = repos.find(r => r.id === selectedRepo);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId.trim()) {
      toast({ title: 'Session ID required', variant: 'destructive' });
      return;
    }
    if (balance < deployCost) {
      toast({ title: 'Insufficient GRT', description: `You need ${deployCost} GRT. Current: ${balance} GRT`, variant: 'destructive' });
      return;
    }
    if (!selectedRepo) {
      toast({ title: 'Select a bot to deploy', variant: 'destructive' });
      return;
    }

    // Build extra vars object
    const extraVars: Record<string, string> = {};
    customVars.forEach(v => { if (v.key.trim()) extraVars[v.key.trim()] = v.value; });

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('deploy-bot', {
        body: {
          sessionId: sessionId.trim(),
          region,
          userId: user?.id,
          repoId: selectedRepo,
          customVars: extraVars,
        },
      });

      if (error) {
        // Extract message from FunctionsHttpError
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
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Deploy WhatsApp Bot</h1>
          <p className="text-muted-foreground">Choose a bot, enter your session ID, and deploy</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><Rocket className="w-5 h-5 text-primary" /> New Deployment</CardTitle>
            <CardDescription>Cost: {deployCost} GRT per deployment</CardDescription>
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
                    Insufficient balance. Fund your account with at least {deployCost} GRT.
                  </div>
                )}

                {/* Bot Selection */}
                <div className="space-y-2">
                  <Label>Select Bot</Label>
                  <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                    <SelectTrigger><SelectValue placeholder="Choose a bot" /></SelectTrigger>
                    <SelectContent>
                      {repos.map(r => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} {r.description ? `— ${r.description}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session">Session ID</Label>
                  <Input
                    id="session"
                    placeholder={`Paste your ${selectedRepoData?.name || 'bot'} session ID`}
                    value={sessionId}
                    onChange={e => setSessionId(e.target.value)}
                    required
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Stored as <span className="font-mono">{selectedRepoData?.session_var_name || 'SESSION_ID'}</span> env var
                  </p>
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
                  <p className="text-xs text-muted-foreground">Add extra config vars to your Heroku app (optional)</p>
                </div>

                <Button type="submit" className="w-full glow-green gap-2" disabled={loading || balance < deployCost}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  Deploy Bot ({deployCost} GRT)
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
