import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Bot, LayoutDashboard, Rocket, Wallet, Settings, LogOut, Shield, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const userLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dashboard/deploy', label: 'Deploy Bot', icon: Rocket },
  { to: '/dashboard/fund', label: 'Fund Account', icon: Wallet },
];

const adminLinks = [
  { to: '/admin', label: 'Admin Panel', icon: Shield },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
        .then(({ data }) => setIsAdmin(!!data));
    }
  }, [user]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Bot className="w-10 h-10 text-primary animate-pulse" /></div>;
  if (!user) return null;

  const links = [...userLinks, ...(isAdmin ? adminLinks : [])];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <Bot className="w-8 h-8 text-primary" />
          <span className="font-display text-lg font-bold text-foreground">GURU HOST</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {links.map(l => (
            <Link key={l.to} to={l.to} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${location.pathname === l.to ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
              <l.icon className="w-4 h-4" /> {l.label}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" className="justify-start gap-3 text-muted-foreground mt-auto" onClick={() => signOut().then(() => navigate('/'))}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-card flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-primary" />
          <span className="font-display font-bold text-foreground">GURU HOST</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6 text-foreground" /> : <Menu className="w-6 h-6 text-foreground" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 pt-14">
          <nav className="p-4 space-y-1">
            {links.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm ${location.pathname === l.to ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`}>
                <l.icon className="w-5 h-5" /> {l.label}
              </Link>
            ))}
            <button onClick={() => { signOut(); navigate('/'); }} className="flex items-center gap-3 px-3 py-3 text-muted-foreground text-sm w-full">
              <LogOut className="w-5 h-5" /> Sign Out
            </button>
          </nav>
        </div>
      )}

      <main className="flex-1 md:p-8 p-4 pt-18 md:pt-8 overflow-auto">{children}</main>
    </div>
  );
}
