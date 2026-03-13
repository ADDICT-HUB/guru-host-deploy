import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bot, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <Bot className="w-10 h-10 text-primary" />
            <span className="font-display text-2xl font-bold text-foreground">GURU HOST <span className="text-primary">2026</span></span>
          </Link>
        </div>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display">Welcome Back</CardTitle>
            <CardDescription>Sign in to manage your bots</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full glow-green" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Sign In
              </Button>
              <div className="flex justify-between text-sm">
                <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
                <Link to="/signup" className="text-primary hover:underline">Create account</Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
