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
import { Rocket, Loader2, AlertCircle } from 'lucide-react';

const DEPLOY_COST = 50;

export default function DeployBot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState('');
  const [region, setRegion] = useState('us');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('balance').eq('id', user.id).single()
        .then(({ data }) => { setBalance(data?.balance || 0); setFetching(false); });
    }
  }, [user]);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId.trim()) {
      toast({ title: 'Session ID required', variant: 'destructive' });
      return;
    }
    if (balance < DEPLOY_COST) {
      toast({ title: 'Insufficient GRT', description: `You need ${DEPLOY_COST} GRT. Current balance: ${balance} GRT`, variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke('deploy-bot', {
      body: { sessionId: sessionId.trim(), region, userId: user?.id },
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Deployment failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '🚀 Bot Deployed!', description: `${data?.appName} is being built...` });
      navigate('/dashboard');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Deploy GURU-MD Bot</h1>
          <p className="text-muted-foreground">Enter your session ID and deploy to Heroku</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><Rocket className="w-5 h-5 text-primary" /> New Deployment</CardTitle>
            <CardDescription>Cost: {DEPLOY_COST} GRT per deployment</CardDescription>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <form onSubmit={handleDeploy} className="space-y-5">
                <div className="p-3 rounded-lg bg-secondary/50 border border-border flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Your Balance</span>
                  <span className={`font-display font-bold text-lg ${balance >= DEPLOY_COST ? 'text-primary' : 'text-destructive'}`}>{balance} GRT</span>
                </div>

                {balance < DEPLOY_COST && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Insufficient balance. Fund your account with at least {DEPLOY_COST} GRT.
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="session">Session ID</Label>
                  <Input id="session" placeholder="Paste your GURU-MD session ID here" value={sessionId} onChange={e => setSessionId(e.target.value)} required className="font-mono text-sm" />
                  <p className="text-xs text-muted-foreground">Get your session ID from the GURU-MD bot setup</p>
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

                <Button type="submit" className="w-full glow-green gap-2" disabled={loading || balance < DEPLOY_COST}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  Deploy Bot ({DEPLOY_COST} GRT)
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
