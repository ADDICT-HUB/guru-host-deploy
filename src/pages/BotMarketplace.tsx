import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import QuickDeployModal from '@/components/QuickDeployModal';
import { Loader2, Rocket, ExternalLink, Github, Search, Star, TrendingUp, Zap, Store } from 'lucide-react';

interface MarketplaceBot {
  id: string;
  name: string;
  description: string | null;
  repo_url: string;
  pairing_link: string | null;
  image_url: string | null;
  session_var_name: string;
  category: string;
  featured: boolean;
  deploy_count: number;
}

export default function BotMarketplace() {
  const [bots, setBots] = useState<MarketplaceBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [deployBot, setDeployBot] = useState<MarketplaceBot | null>(null);

  useEffect(() => {
    supabase.from('marketplace_bots').select('*').eq('active', true).order('featured', { ascending: false }).order('deploy_count', { ascending: false })
      .then(({ data }) => {
        setBots(data || []);
        setLoading(false);
      });
  }, []);

  const categories = ['all', ...new Set(bots.map(b => b.category))];

  const filtered = bots.filter(b => {
    const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || b.category === category;
    return matchSearch && matchCat;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2">
            <Store className="w-8 h-8 text-primary" /> Bot Marketplace
          </h1>
          <p className="text-muted-foreground">Choose your preferred WhatsApp bot and deploy in seconds</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search bots..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map(c => (
              <Button key={c} size="sm" variant={category === c ? 'default' : 'outline'} onClick={() => setCategory(c)} className="capitalize">
                {c}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No bots found</p>
            <Link to="/dashboard/deploy"><Button className="mt-3 gap-2" size="sm"><Rocket className="w-4 h-4" /> Deploy Custom Repo</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(bot => (
              <Card key={bot.id} className="bg-card border-border card-hover relative overflow-hidden">
                {bot.featured && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-guru-yellow/20 text-guru-yellow border-guru-yellow/30 gap-1">
                      <Star className="w-3 h-3" /> Featured
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    {bot.image_url ? (
                      <img src={bot.image_url} alt={bot.name} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Rocket className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    {bot.name}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2">{bot.description || 'WhatsApp MD Bot'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] capitalize">{bot.category}</Badge>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {bot.deploy_count} deploys</span>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground truncate">
                    Var: {bot.session_var_name}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 gap-1" onClick={() => setDeployBot(bot)}>
                      <Zap className="w-3 h-3" /> Quick Deploy
                    </Button>
                    {bot.pairing_link && (
                      <a href={bot.pairing_link} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="gap-1">
                          <ExternalLink className="w-3 h-3" /> Pair
                        </Button>
                      </a>
                    )}
                    <a href={bot.repo_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="gap-1">
                        <Github className="w-3 h-3" /> Repo
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center">
          <Link to="/dashboard/deploy">
            <Button variant="outline" className="gap-2"><Rocket className="w-4 h-4" /> Deploy Custom Repository</Button>
          </Link>
        </div>
      </div>

      {deployBot && (
        <QuickDeployModal
          open={!!deployBot}
          onOpenChange={(v) => !v && setDeployBot(null)}
          bot={deployBot}
        />
      )}
    </DashboardLayout>
  );
}
