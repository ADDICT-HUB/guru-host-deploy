import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { Loader2, Terminal, FileCode, Copy, CheckCircle } from 'lucide-react';

interface BuildLogsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bot: {
    id: string;
    app_name: string;
    build_id?: string | null;
    repo_url?: string | null;
    custom_vars?: Record<string, string> | null;
    status: string;
  };
}

export default function BuildLogsViewer({ open, onOpenChange, bot }: BuildLogsViewerProps) {
  const [buildOutput, setBuildOutput] = useState('');
  const [appJson, setAppJson] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [appJsonLoading, setAppJsonLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchBuildOutput = async () => {
    if (!bot.build_id) return;
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('heroku-proxy', {
        body: { action: 'build-output', appName: bot.app_name, buildId: bot.build_id, botId: bot.id },
      });
      setBuildOutput(data?.output || data?.logs || 'No build output available');
    } catch {
      setBuildOutput('Failed to fetch build output');
    }
    setLoading(false);
  };

  const fetchAppJson = async () => {
    if (!bot.repo_url) return;
    setAppJsonLoading(true);
    try {
      const match = bot.repo_url.replace(/\.git$/, '').replace(/\/+$/, '').match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        const res = await fetch(`https://api.github.com/repos/${match[1]}/${match[2]}/contents/app.json`, {
          headers: { Accept: 'application/vnd.github.v3.raw' },
        });
        if (res.ok) {
          const data = await res.json();
          setAppJson(data);
        } else {
          setAppJson({ _error: 'No app.json found in this repo' });
        }
      }
    } catch {
      setAppJson({ _error: 'Failed to fetch app.json' });
    }
    setAppJsonLoading(false);
  };

  const handleOpen = () => {
    if (open) {
      fetchBuildOutput();
      fetchAppJson();
    }
  };

  // Auto-fetch on open
  useState(() => { if (open) { fetchBuildOutput(); fetchAppJson(); } });

  const copyLogs = () => {
    navigator.clipboard.writeText(buildOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) { fetchBuildOutput(); fetchAppJson(); } }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            Build Logs — {bot.app_name}
            <Badge className={bot.status === 'active' ? 'bg-primary/20 text-primary' : bot.status === 'crashed' ? 'bg-destructive/20 text-destructive' : 'bg-guru-yellow/20 text-guru-yellow'}>
              {bot.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-2">
          <Button size="sm" variant="outline" onClick={fetchBuildOutput} disabled={loading} className="gap-1">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Terminal className="w-3 h-3" />} Refresh Logs
          </Button>
          <Button size="sm" variant="outline" onClick={copyLogs} className="gap-1">
            {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="bg-background rounded-lg border border-border p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/80 min-h-[200px]">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading build output...</div>
            ) : buildOutput || 'No build output yet. Click "Refresh Logs" to fetch.'}
          </div>
        </ScrollArea>

        {/* App.json / Environment Variables */}
        {appJson && !appJson._error && (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-foreground flex items-center gap-1"><FileCode className="w-4 h-4 text-primary" /> app.json Environment Variables</p>
            <div className="grid gap-1 text-xs">
              {appJson.env && Object.entries(appJson.env).map(([key, val]: [string, any]) => (
                <div key={key} className="flex items-center justify-between p-2 rounded bg-secondary/30 border border-border">
                  <span className="font-mono font-medium text-foreground">{key}</span>
                  <span className="text-muted-foreground">{val?.description || val?.value || (typeof val === 'string' ? val : 'required')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current bot config vars */}
        {bot.custom_vars && Object.keys(bot.custom_vars).length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-foreground">Deployed Config Vars</p>
            <div className="grid gap-1 text-xs">
              {Object.entries(bot.custom_vars).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between p-2 rounded bg-secondary/30 border border-border">
                  <span className="font-mono font-medium text-foreground">{key}</span>
                  <span className="text-muted-foreground font-mono">{String(val).substring(0, 30)}...</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
