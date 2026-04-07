import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { Loader2, Radio, Square, Terminal, Download } from 'lucide-react';

interface LiveLogsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bot: { id: string; app_name: string };
}

export default function LiveLogs({ open, onOpenChange, bot }: LiveLogsProps) {
  const [logs, setLogs] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke('heroku-proxy', {
      body: { action: 'logs', appName: bot.app_name, botId: bot.id },
    });
    setLogs(data?.logs || 'No logs available');
    setLoading(false);
  };

  const startStreaming = () => {
    setStreaming(true);
    fetchLogs();
    intervalRef.current = setInterval(fetchLogs, 5000);
  };

  const stopStreaming = () => {
    setStreaming(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (open) fetchLogs();
    return () => stopStreaming();
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const downloadLogs = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bot.app_name}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) stopStreaming(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            Live Logs — {bot.app_name}
            {streaming && <span className="flex items-center gap-1 text-xs text-primary"><Radio className="w-3 h-3 animate-pulse" /> Live</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-2">
          {streaming ? (
            <Button size="sm" variant="outline" onClick={stopStreaming} className="gap-1 text-destructive">
              <Square className="w-3 h-3" /> Stop
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={startStreaming} className="gap-1">
              <Radio className="w-3 h-3" /> Stream Live
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={fetchLogs} disabled={loading} className="gap-1">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Terminal className="w-3 h-3" />} Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={downloadLogs} className="gap-1">
            <Download className="w-3 h-3" /> Download
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div ref={scrollRef} className="bg-background rounded-lg border border-border p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/80 min-h-[300px] max-h-[500px] overflow-auto">
            {loading && !logs ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
            ) : logs || 'No logs yet...'}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
