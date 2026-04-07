import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Bot, CheckCircle, AlertTriangle, XCircle, Loader2, TrendingUp, Activity } from 'lucide-react';

interface BotHealthBarProps {
  bots: Array<{ status: string; created_at: string }>;
}

export default function BotHealthBar({ bots }: BotHealthBarProps) {
  const total = bots.length;
  const active = bots.filter(b => b.status === 'active').length;
  const deploying = bots.filter(b => b.status === 'deploying').length;
  const crashed = bots.filter(b => b.status === 'crashed').length;
  const stopped = bots.filter(b => b.status === 'stopped').length;
  const healthPct = total > 0 ? Math.round((active / total) * 100) : 0;

  // Trending: bots created in last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const trending = bots.filter(b => new Date(b.created_at) > weekAgo).length;

  const stats = [
    { label: 'Active', value: active, icon: CheckCircle, color: 'text-primary' },
    { label: 'Deploying', value: deploying, icon: Loader2, color: 'text-guru-yellow', animate: true },
    { label: 'Crashed', value: crashed, icon: XCircle, color: 'text-destructive' },
    { label: 'Stopped', value: stopped, icon: AlertTriangle, color: 'text-muted-foreground' },
    { label: 'This Week', value: trending, icon: TrendingUp, color: 'text-primary' },
  ];

  return (
    <div className="space-y-3">
      {/* Health Progress */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Bot Health
            </span>
            <span className={`text-sm font-bold ${healthPct >= 80 ? 'text-primary' : healthPct >= 50 ? 'text-guru-yellow' : 'text-destructive'}`}>
              {healthPct}%
            </span>
          </div>
          <Progress value={healthPct} className="h-2" />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">{active} of {total} bots running</span>
            {crashed > 0 && <span className="text-xs text-destructive">{crashed} issue{crashed > 1 ? 's' : ''}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Status Grid */}
      <div className="grid grid-cols-5 gap-2">
        {stats.map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color} ${s.animate ? 'animate-spin' : ''}`} />
              <p className="text-lg font-display font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
