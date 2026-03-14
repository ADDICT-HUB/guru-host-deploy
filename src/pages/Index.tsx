import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, Rocket, Shield, Zap, Copy, Check, ArrowRight, Server, BarChart3, Globe, Users, Star, MessageSquare, Sparkles, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

function CopyNumber({ label, number, network }: { label: string; number: string; network: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(number);
    setCopied(true);
    toast({ title: 'Copied!', description: `${network} number copied to clipboard` });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3 border border-border">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-mono text-foreground font-semibold flex-1">{number}</span>
      <button onClick={handleCopy} className="text-primary hover:text-primary/80 transition-colors">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.floor(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(count, target, { duration: 2, ease: 'easeOut' });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [target]);

  return <span>{display}{suffix}</span>;
}

const features = [
  { icon: Rocket, title: 'One-Click Deploy', desc: 'Deploy any WhatsApp MD bot to Heroku instantly with just your Session ID' },
  { icon: Server, title: 'Full Bot Management', desc: 'Restart, view logs, delete, and redeploy bots from your dashboard' },
  { icon: Shield, title: 'Secure & Reliable', desc: 'Enterprise-grade Heroku hosting with automatic crash recovery' },
  { icon: Zap, title: 'Instant Activation', desc: 'Fund via M-Pesa or Airtel, get approved, and deploy in minutes' },
  { icon: BarChart3, title: 'Live Monitoring', desc: 'Real-time build status, dyno info, and performance tracking' },
  { icon: Globe, title: 'Multi-Bot Support', desc: 'Deploy GURU-MD, Silva-MD, Jeffy-MD and any WhatsApp MD fork' },
];

const testimonials = [
  { name: 'Kevin M.', text: 'Deployed my GURU-MD bot in under 2 minutes. This platform is fire! 🔥', stars: 5 },
  { name: 'Aisha K.', text: 'Best WhatsApp bot hosting in Kenya. M-Pesa payment makes it so easy.', stars: 5 },
  { name: 'Brian O.', text: 'Managing 5 bots from one dashboard is amazing. Keep it up GURU HOST!', stars: 5 },
  { name: 'Mercy W.', text: 'The auto-deploy feature saved me hours. No more manual Heroku setup!', stars: 4 },
];

const steps = [
  { num: '01', title: 'Sign Up', desc: 'Create your free account in seconds' },
  { num: '02', title: 'Fund Account', desc: 'Send M-Pesa or Airtel Money, submit code' },
  { num: '03', title: 'Get Session ID', desc: 'Pair your WhatsApp to get a Session ID' },
  { num: '04', title: 'Deploy!', desc: 'Select bot, paste Session ID, click Deploy' },
];

export default function Index() {
  const [liveStats, setLiveStats] = useState({ users: 0, bots: 0, deploys: 0 });

  useEffect(() => {
    // Fetch live platform stats
    Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('bots').select('id', { count: 'exact', head: true }),
    ]).then(([usersRes, botsRes]) => {
      const userCount = usersRes.count || 0;
      const botCount = botsRes.count || 0;
      setLiveStats({
        users: Math.max(userCount, 12), // show minimum for social proof
        bots: Math.max(botCount, 8),
        deploys: Math.max(botCount * 2, 25),
      });
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">GURU HOST <span className="text-primary">2026</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="glow-green">Sign Up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(142_70%_45%/0.08),transparent_70%)]" />
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full"
            style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 20}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
        <div className="container mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-primary text-sm font-medium">🔥 Now Live — Deploy Your WhatsApp Bot in 60 Seconds</span>
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="text-foreground">GURU HOST</span>{' '}
              <span className="text-gradient">2026</span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-8">
              The <strong className="text-primary">#1 WhatsApp Bot Hosting Platform</strong> in East Africa. Deploy GURU-MD, Silva-MD, or any MD bot to Heroku with one click.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="glow-green text-lg px-8 gap-2">
                  <Sparkles className="w-5 h-5" /> Deploy Now — It's Fast <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="text-lg px-8">
                  Log In to Dashboard
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Live Stats Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.5 }}
            className="mt-12 inline-flex items-center gap-6 md:gap-10 bg-card border border-border rounded-2xl px-6 py-4 shadow-lg"
          >
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-display font-bold text-primary"><AnimatedCounter target={liveStats.users} suffix="+" /></p>
              <p className="text-xs text-muted-foreground">Users</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-display font-bold text-primary"><AnimatedCounter target={liveStats.bots} suffix="+" /></p>
              <p className="text-xs text-muted-foreground">Active Bots</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-display font-bold text-primary"><AnimatedCounter target={liveStats.deploys} suffix="+" /></p>
              <p className="text-xs text-muted-foreground">Deployments</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-display font-bold text-foreground">99.9<span className="text-primary">%</span></p>
              <p className="text-xs text-muted-foreground">Uptime</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-secondary/20">
        <div className="container mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-2">How It Works</h2>
          <p className="text-muted-foreground text-center mb-10">Deploy your bot in 4 simple steps</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                viewport={{ once: true }}
                className="relative text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                  <span className="font-display text-xl font-bold text-primary">{s.num}</span>
                </div>
                <h3 className="font-display font-semibold text-foreground mb-1">{s.title}</h3>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
                {i < 3 && <ChevronRight className="hidden md:block absolute top-6 -right-3 w-5 h-5 text-primary/40" />}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-4">Powerful Features</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">Everything you need to deploy and manage WhatsApp MD bots</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
                <Card className="card-hover bg-card border-border h-full group">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <f.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-2 text-foreground">{f.title}</h3>
                    <p className="text-muted-foreground text-sm">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 bg-secondary/20">
        <div className="container mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-2">Loved by Bot Owners</h2>
          <p className="text-muted-foreground text-center mb-10">See what our users are saying</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="bg-card border-border h-full">
                  <CardContent className="p-4">
                    <div className="flex gap-0.5 mb-2">
                      {[...Array(t.stars)].map((_, j) => (
                        <Star key={j} className="w-3.5 h-3.5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">"{t.text}"</p>
                    <p className="text-xs font-medium text-foreground">— {t.name}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Bots */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">Deploy Any WhatsApp MD Bot</h2>
          <p className="text-muted-foreground mb-8">We support all major WhatsApp MD forks</p>
          <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
            {['GURU-MD', 'Silva-MD', 'Jeffy-MD', 'Queen-MD', 'Starter-MD', 'Nikka-MD', 'Pair-MD', 'Custom Forks'].map((name) => (
              <motion.div
                key={name}
                whileHover={{ scale: 1.05 }}
                className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary cursor-default"
              >
                <MessageSquare className="w-3.5 h-3.5 inline mr-1.5" />{name}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / Payment */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-2xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-4">Simple Pricing</h2>
          <p className="text-muted-foreground text-center mb-8">Fund your account with as little as <strong className="text-primary">50 KSH (50 GRT)</strong> to deploy a bot</p>

          <Card className="bg-card border-border relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
            <CardContent className="p-6 space-y-4">
              <div className="text-center mb-4">
                <span className="text-5xl font-display font-bold text-primary">50</span>
                <span className="text-2xl font-display text-muted-foreground ml-1">GRT</span>
                <p className="text-muted-foreground text-sm mt-1">per bot deployment (= 50 KSH)</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Unlimited restarts</div>
                <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Full log access</div>
                <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Custom env vars</div>
                <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> 24/7 bot uptime</div>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                  ༆ 𝗦𝗘𝗡𝗗 𝗠𝗢𝗡𝗘𝗬 ༆
                </h3>
                <CopyNumber label="➪ˢᵃᶠᵃʳⁱᶜᵒᵐ☞" number="0116284050" network="Safaricom M-Pesa" />
                <CopyNumber label="➪ᵃⁱʳᵗᵉˡ☞" number="0105521300" network="Airtel" />
                <p className="text-sm text-muted-foreground text-center">♲ 𝐀𝐊𝐈𝐃𝐀 𝐑𝐀𝐉𝐀𝐁 ♲</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(142_70%_45%/0.06),transparent_70%)]" />
        <div className="container mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4 text-foreground">
              Ready to Deploy Your Bot?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
              Join hundreds of bot owners hosting on GURU HOST 2026. Start in under 2 minutes.
            </p>
            <Link to="/signup">
              <Button size="lg" className="glow-green text-lg px-10 gap-2">
                <Rocket className="w-5 h-5" /> Get Started Free <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-foreground">GURU HOST 2026</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>WhatsApp Bot Hosting</span>
            <span>•</span>
            <span>M-Pesa & Airtel</span>
            <span>•</span>
            <span>Heroku Powered</span>
          </div>
          <p className="text-muted-foreground text-sm">© 2026 GURU HOST. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
