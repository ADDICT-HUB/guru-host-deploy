import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Rocket, Wallet, Bot, RefreshCw, Trash2, FileText, Loader2 } from 'lucide-react';

interface BotRow {
  id: string;
  app_name: string;
  session_id: string;
  status: string;
  created_at: string;
  build_id?: string | null;
}

const statusColors: Record<string, string> = {
  active: 'bg-primary/20 text-primary border-primary/30',
  deploying: 'bg-guru-yellow/20 text-guru-yellow border-guru-yellow/30',
  crashed: 'bg-destructive/20 text-destructive border-destructive/30',
  stopped: 'bg-muted text-muted-foreground border-border',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [bots, setBots] = useState<BotRow[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [botsRes, profileRes] = await Promise.all([
      supabase.from('bots').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('balance').eq('id', user.id).single(),
    ]);
    setBots(botsRes.data || []);
    setBalance(profileRes.data?.balance || 0);
    setLoading(false);
  };

  // Poll build status for deploying bots
  const pollBuildStatus = useCallback(async () => {
    const deployingBots = bots.filter(b => b.status === 'deploying' && b.build_id);
    if (deployingBots.length === 0) return;

    for (const bot of deployingBots) {
      try {
        const { data, error } = await supabase.functions.invoke('heroku-proxy', {
          body: { action: 'build-status', appName: bot.app_name, buildId: bot.build_id, botId: bot.id },
        });

        if (error || !data) continue;

        const buildStatus = data.status;
        if (buildStatus === 'succeeded') {
          setBots(prev => prev.map(b => b.id === bot.id ? { ...b, status: 'active' } : b));
          toast({ title: '✅ Bot is live!', description: `${bot.app_name} deployed successfully` });
        } else if (buildStatus === 'failed') {
          setBots(prev => prev.map(b => b.id === bot.id ? { ...b, status: 'crashed' } : b));
          toast({ title: '❌ Build failed', description: `${bot.app_name} build failed. Check logs.`, variant: 'destructive' });
        }
      } catch {
        // silently continue
      }
    }
  }, [bots]);

  useEffect(() => { fetchData(); }, [user]);

  // Set up polling interval for deploying bots
  useEffect(() => {
    const hasDeploying = bots.some(b => b.status === 'deploying');

    if (hasDeploying) {
      // Poll every 10 seconds
      pollRef.current = setInterval(() => {
        pollBuildStatus();
      }, 10000);
      // Also poll immediately
      pollBuildStatus();
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [bots.filter(b => b.status === 'deploying').length, pollBuildStatus]);

  const handleRestart = async (bot: BotRow) => {
    setActionLoading(bot.id);
    const { error } = await supabase.functions.invoke('heroku-proxy', {
      body: { action: 'restart', appName: bot.app_name, botId: bot.id },
    });
    setActionLoading(null);
    if (error) toast({ title: 'Restart failed', description: error.message, variant: 'destructive' });
    else toast({ title: 'Bot restarted', description: `${bot.app_name} is restarting...` });
  };

  const handleDelete = async (bot: BotRow) => {
    if (!confirm(`Delete ${bot.app_name}? This cannot be undone.`)) return;
    setActionLoading(bot.id);
    const { error } = await supabase.functions.invoke('heroku-proxy', {
      body: { action: 'delete', appName: bot.app_name, botId: bot.id },
    });
    if (!error) {
      await supabase.from('bots').delete().eq('id', bot.id);
      setBots(prev => prev.filter(b => b.id !== bot.id));
      toast({ title: 'Bot deleted' });
    } else {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    }
    setActionLoading(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Manage your GURU-MD bots</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Wallet className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">GRT Balance</p>
                <p className="text-2xl font-display font-bold text-foreground">{balance}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Bot className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Active Bots</p>
                <p className="text-2xl font-display font-bold text-foreground">{bots.filter(b => b.status === 'active').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Rocket className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Deploys</p>
                <p className="text-2xl font-display font-bold text-foreground">{bots.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Link to="/dashboard/deploy"><Button className="glow-green gap-2"><Rocket className="w-4 h-4" /> Deploy New Bot</Button></Link>
          <Link to="/dashboard/fund"><Button variant="outline" className="gap-2"><Wallet className="w-4 h-4" /> Fund Account</Button></Link>
        </div>

        {/* Bot List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display flex items-center justify-between">
              <span>My Bots</span>
              <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : bots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No bots deployed yet</p>
                <Link to="/dashboard/deploy"><Button className="mt-3 gap-2" size="sm"><Rocket className="w-4 h-4" /> Deploy Your First Bot</Button></Link>
              </div>
            ) : (
              <div className="space-y-3">
                {bots.map(bot => (
                  <div key={bot.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-foreground truncate">{bot.app_name}</span>
                        <Badge className={`text-xs ${statusColors[bot.status] || statusColors.stopped}`}>
                          {bot.status === 'active' && <span className="w-1.5 h-1.5 bg-primary rounded-full mr-1 inline-block animate-pulse" />}
                          {bot.status === 'deploying' && <Loader2 className="w-3 h-3 mr-1 inline-block animate-spin" />}
                          {bot.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate">Session: {bot.session_id.substring(0, 20)}...</p>
                      {bot.status === 'deploying' && (
                        <div className="mt-2 space-y-1">
                          <Progress value={undefined} className="h-1.5" />
                          <p className="text-xs text-muted-foreground animate-pulse">Building... auto-updating every 10s</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => handleRestart(bot)} disabled={actionLoading === bot.id || bot.status === 'deploying'}>
                        <RefreshCw className={`w-3 h-3 ${actionLoading === bot.id ? 'animate-spin' : ''}`} /> Restart
                      </Button>
                      <Link to={`/dashboard/bot/${bot.id}`}>
                        <Button variant="outline" size="sm" className="gap-1"><FileText className="w-3 h-3" /> Logs</Button>
                      </Link>
                      <Button variant="outline" size="sm" className="gap-1 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(bot)} disabled={actionLoading === bot.id || bot.status === 'deploying'}>
                        <Trash2 className="w-3 h-3" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
