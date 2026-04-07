import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Rocket, Loader2, ExternalLink, Zap } from 'lucide-react';

interface QuickDeployModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bot: {
    name: string;
    repo_url: string;
    session_var_name: string;
    pairing_link?: string | null;
    description?: string | null;
  };
}

export default function QuickDeployModal({ open, onOpenChange, bot }: QuickDeployModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [deployCost, setDeployCost] = useState(50);

  useEffect(() => {
    if (user && open) {
      Promise.all([
        supabase.from('profiles').select('balance').eq('id', user.id).single(),
        supabase.from('platform_settings').select('value').eq('key', 'deploy_cost').single(),
      ]).then(([profileRes, costRes]) => {
        setBalance(profileRes.data?.balance || 0);
        if (costRes.data) setDeployCost(parseInt(costRes.data.value) || 50);
      });
    }
  }, [user, open]);

  const handleDeploy = async () => {
    if (!sessionId.trim()) {
      toast({ title: 'Session ID required', variant: 'destructive' });
      return;
    }
    if (balance < deployCost) {
      toast({ title: 'Insufficient GRT', description: `Need ${deployCost} GRT`, variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke('deploy-bot', {
      body: {
        sessionId: sessionId.trim(),
        repoUrl: bot.repo_url,
        sessionVarName: bot.session_var_name,
        region: 'us',
        userId: user?.id,
      },
    });

    setLoading(false);
    if (error || data?.error) {
      toast({ title: 'Deploy failed', description: data?.error || error?.message, variant: 'destructive' });
    } else {
      toast({ title: '🚀 Bot Deployed!', description: `${data?.appName} is building...` });
      // Increment deploy count
      supabase.rpc('add_balance', { user_id_input: user!.id, amount_input: 0 }); // placeholder
      onOpenChange(false);
      navigate('/dashboard');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Quick Deploy — {bot.name}
          </DialogTitle>
          <DialogDescription>{bot.description || 'Deploy this bot with one click'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-secondary/50 border border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Balance</span>
            <span className={`font-display font-bold ${balance >= deployCost ? 'text-primary' : 'text-destructive'}`}>{balance} GRT</span>
          </div>

          {bot.pairing_link && (
            <a href={bot.pairing_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-primary hover:bg-primary/10 transition-colors">
              <ExternalLink className="w-4 h-4" />
              Get your Session ID (Pairing Link)
            </a>
          )}

          <div className="space-y-2">
            <Label>Session ID</Label>
            <Input
              placeholder="Paste your session ID here"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Repo: <span className="font-mono text-foreground">{bot.repo_url}</span></p>
            <p>Session Var: <span className="font-mono text-foreground">{bot.session_var_name}</span></p>
            <p>Cost: <span className="font-bold text-foreground">{deployCost} GRT</span></p>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 gap-2" onClick={handleDeploy} disabled={loading || !sessionId.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {loading ? 'Deploying...' : 'Deploy Now'}
            </Button>
            <Button variant="outline" onClick={() => {
              onOpenChange(false);
              navigate(`/dashboard/deploy?repo=${encodeURIComponent(bot.repo_url)}&var=${encodeURIComponent(bot.session_var_name)}`);
            }}>
              Full Form
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
