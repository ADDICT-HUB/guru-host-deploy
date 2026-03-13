import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, Rocket, Shield, Zap, Copy, Check, ArrowRight, Server, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

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

const features = [
  { icon: Rocket, title: 'One-Click Deploy', desc: 'Deploy GURU-MD bot to Heroku instantly with your Session ID' },
  { icon: Server, title: 'Full Management', desc: 'Restart, view logs, delete, and redeploy bots from your dashboard' },
  { icon: Shield, title: 'Secure & Reliable', desc: 'Enterprise-grade Heroku hosting with 24/7 uptime monitoring' },
  { icon: Zap, title: 'Instant Activation', desc: 'Fund via M-Pesa or Airtel, get approved, and deploy in minutes' },
  { icon: BarChart3, title: 'Live Monitoring', desc: 'Real-time build logs, dyno status, and performance metrics' },
  { icon: Bot, title: 'GURU-MD Optimized', desc: 'Pre-configured buildpacks and config vars for GURU-MD WhatsApp bot' },
];

export default function Index() {
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
        <div className="container mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-primary text-sm font-medium">Now Live — Deploy Your WhatsApp Bot</span>
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="text-foreground">GURU HOST</span>{' '}
              <span className="text-gradient">2026</span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-8">
              The most powerful WhatsApp bot hosting platform. Deploy <strong className="text-foreground">GURU-MD</strong> to Heroku with one click. Manage, monitor, and scale your bots effortlessly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="glow-green text-lg px-8 gap-2">
                  Get Started <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="text-lg px-8">
                  Log In to Dashboard
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-4">Everything You Need</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">Deploy and manage your GURU-MD WhatsApp bots with enterprise-grade tools</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
                <Card className="card-hover bg-card border-border h-full">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
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

      {/* Pricing / Payment */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-2xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-4">Simple Pricing</h2>
          <p className="text-muted-foreground text-center mb-8">Fund your account with as little as <strong className="text-primary">50 KSH (50 GRT)</strong> to deploy a bot</p>

          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <div className="text-center mb-4">
                <span className="text-5xl font-display font-bold text-primary">50</span>
                <span className="text-2xl font-display text-muted-foreground ml-1">GRT</span>
                <p className="text-muted-foreground text-sm mt-1">per bot deployment (= 50 KSH)</p>
              </div>

              <div className="space-y-3">
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

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-foreground">GURU HOST 2026</span>
          </div>
          <p className="text-muted-foreground text-sm">© 2026 GURU HOST. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
