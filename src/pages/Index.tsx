import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Bot, Rocket, Shield, Zap, Users, ArrowRight, Star, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function AnimatedCounter({ target, label }: { target: number; label: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-primary">{count.toLocaleString()}+</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

const features = [
  { icon: Rocket, title: 'One-Click Deploy', desc: 'Deploy your WhatsApp bot to Heroku in seconds with zero config.' },
  { icon: Shield, title: 'Secure & Reliable', desc: 'Enterprise-grade infrastructure with 24/7 uptime monitoring.' },
  { icon: Zap, title: 'Instant Activation', desc: 'Your bot goes live immediately after deployment completes.' },
  { icon: Users, title: 'Multi-Bot Support', desc: 'Deploy and manage multiple bots from a single dashboard.' },
];

const steps = [
  { step: '01', title: 'Sign Up', desc: 'Create your free account in seconds' },
  { step: '02', title: 'Fund Account', desc: 'Add GRT tokens to your balance' },
  { step: '03', title: 'Enter Session', desc: 'Paste your WhatsApp session ID' },
  { step: '04', title: 'Deploy!', desc: 'Hit deploy and your bot is live' },
];

const testimonials = [
  { name: 'Silva', role: 'Bot Developer', text: 'GURU HOST made deploying my WhatsApp bot effortless. Best platform out there!', rating: 5 },
  { name: 'Alex K.', role: 'Community Admin', text: 'Managing multiple bots from one dashboard is a game-changer. Highly recommend!', rating: 5 },
  { name: 'Sarah M.', role: 'Tech Enthusiast', text: 'The fastest deployment I\'ve ever experienced. From signup to live bot in under 2 minutes.', rating: 4 },
];

export default function Index() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ users: 150, bots: 420, deploys: 1200 });

  useEffect(() => {
    supabase.from('profiles').select('id', { count: 'exact', head: true }).then(({ count }) => {
      if (count) setStats(s => ({ ...s, users: Math.max(s.users, count) }));
    });
    supabase.from('bots').select('id', { count: 'exact', head: true }).then(({ count }) => {
      if (count) setStats(s => ({ ...s, bots: Math.max(s.bots, count), deploys: Math.max(s.deploys, count * 3) }));
    });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Bot className="w-7 h-7 text-primary" />
            <span className="font-bold text-lg">GURU HOST</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild><Link to="/dashboard">Dashboard <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/login">Log In</Link></Button>
                <Button asChild><Link to="/signup">Sign Up</Link></Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <Sparkles className="w-4 h-4" /> #1 WhatsApp Bot Hosting Platform
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Deploy Your WhatsApp Bot<br />
              <span className="text-primary">In One Click</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              The fastest way to deploy, manage, and scale your WhatsApp MD bots. No server knowledge needed.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild className="text-base">
                <Link to={user ? '/dashboard/deploy' : '/signup'}>
                  <Rocket className="w-5 h-5 mr-2" /> Start Deploying Now
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base">
                <Link to="/login">View Dashboard</Link>
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto"
          >
            <AnimatedCounter target={stats.users} label="Users" />
            <AnimatedCounter target={stats.bots} label="Bots Deployed" />
            <AnimatedCounter target={stats.deploys} label="Deployments" />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-card/50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why GURU HOST?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
              >
                <f.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-primary/20 mb-2">{s.step}</div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-card/50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">What Users Say</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">"{t.text}"</p>
                <div className="font-medium text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="max-w-md mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Simple Pricing</h2>
          <div className="bg-card border border-primary/30 rounded-2xl p-8 text-center">
            <div className="text-5xl font-bold text-primary mb-2">50 GRT</div>
            <div className="text-muted-foreground mb-6">per deployment</div>
            <ul className="text-left space-y-3 mb-8">
              {['24/7 Bot Uptime', 'Auto Restart on Crash', 'Custom Config Variables', 'Multiple Bot Repos', 'Real-time Status Updates'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Button asChild className="w-full" size="lg">
              <Link to={user ? '/dashboard/deploy' : '/signup'}>Get Started</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <span className="font-bold">GURU HOST</span>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} GURU HOST. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
