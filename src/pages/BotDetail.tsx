import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, RefreshCw, Trash2, Rocket, Loader2, Terminal } from 'lucide-react';

export default function BotDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bot, setBot] = useState<any>(null);
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user && id) {
      supabase.from('bots').select('*').eq('id', id).eq('user_id', user.id).single()
        .then(({ data }) => { setBot(data); setLoading(false); });
    }
  }, [user, id]);

  const fetchLogs = async () => {
    if (!bot) return;
    setLogsLoading(true);
    const { data, error } = await supabase.functions.invoke('heroku-proxy', {
      body: { action: 'logs', appName: bot.app_name },
    });
    setLogsLoading(false);
    if (error) toast({ title: 'Failed to fetch logs', variant: 'destructive' });
    else setLogs(data?.logs || 'No logs available');
  };

  const handleRestart = async () => {
    setActionLoading(true);
    await supabase.functions.invoke('heroku-proxy', { body: { action: 'restart', appName: bot.app_name } });
    setActionLoading(false);
    toast({ title: 'Bot restarted' });
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${bot.app_name}? This cannot be undone.`)) return;
    setActionLoading(true);
    await supabase.functions.invoke('heroku-proxy', { body: { action: 'delete', appName: bot.app_name } });
    await supabase.from('bots').delete().eq('id', bot.id);
    toast({ title: 'Bot deleted' });
    navigate('/dashboard');
  };

  if (loading) return <DashboardLayout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  if (!bot) return <DashboardLayout><p className="text-muted-foreground">Bot not found</p></DashboardLayout>;

  const statusColor = bot.status === 'active' ? 'bg-primary/20 text-primary' : bot.status === 'deploying' ? 'bg-guru-yellow/20 text-guru-yellow' : 'bg-destructive/20 text-destructive';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-3">
              {bot.app_name}
              <Badge className={statusColor}>{bot.status}</Badge>
            </h1>
            <p className="text-sm text-muted-foreground font-mono">Session: {bot.session_id}</p>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button className="gap-2" onClick={handleRestart} disabled={actionLoading}>
            <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} /> Restart
          </Button>
          <Button variant="outline" className="gap-2" onClick={fetchLogs} disabled={logsLoading}>
            <Terminal className="w-4 h-4" /> {logsLoading ? 'Loading...' : 'View Logs'}
          </Button>
          <Button variant="outline" className="gap-2 text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={actionLoading}>
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><Terminal className="w-5 h-5 text-primary" /> Build Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-background rounded-lg border border-border p-4 font-mono text-xs text-foreground/80 max-h-96 overflow-auto whitespace-pre-wrap">
              {logs || 'Click "View Logs" to fetch build logs...'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="font-display">Bot Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">App Name</span><span className="font-mono text-foreground">{bot.app_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-foreground">{bot.status}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="text-foreground">{new Date(bot.created_at).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GitHub Repo</span><a href="https://github.com/Gurulabstech/GURU-MD" target="_blank" rel="noreferrer" className="text-primary hover:underline">GURU-MD</a></div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
