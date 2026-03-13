import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Copy, Check, Wallet, Loader2, Send, Clock } from 'lucide-react';

function CopyField({ label, number }: { label: string; number: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3 border border-border">
      <span className="text-muted-foreground text-sm shrink-0">{label}</span>
      <span className="font-mono text-foreground font-semibold flex-1">{number}</span>
      <button onClick={() => { navigator.clipboard.writeText(number); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-primary hover:text-primary/80 transition-colors">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

interface Transaction {
  id: string;
  amount: number;
  transaction_code: string;
  status: string;
  created_at: string;
}

const statusBadge: Record<string, string> = {
  pending: 'bg-guru-yellow/20 text-guru-yellow border-guru-yellow/30',
  approved: 'bg-primary/20 text-primary border-primary/30',
  rejected: 'bg-destructive/20 text-destructive border-destructive/30',
};

export default function FundAccount() {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [txCode, setTxCode] = useState('');
  const [email, setEmail] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);

  const fetchData = async () => {
    if (!user) return;
    const [txRes, profRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('balance').eq('id', user.id).single(),
    ]);
    setTransactions(txRes.data || []);
    setBalance(profRes.data?.balance || 0);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(amount);
    if (!amt || amt < 50) { toast({ title: 'Minimum 50 KSH', variant: 'destructive' }); return; }
    if (!txCode.trim()) { toast({ title: 'Transaction code required', variant: 'destructive' }); return; }

    setLoading(true);
    const { error } = await supabase.from('transactions').insert({
      user_id: user?.id,
      amount: amt,
      transaction_code: txCode.trim().toUpperCase(),
      email: email.trim() || user?.email,
      status: 'pending',
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Payment submitted!', description: 'Awaiting admin approval. You will be funded shortly.' });
      setAmount(''); setTxCode(''); setEmail('');
      fetchData();
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Fund Account</h1>
          <p className="text-muted-foreground">Add GRT to your balance via M-Pesa or Airtel</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <span className="text-5xl font-display font-bold text-primary">{balance}</span>
              <span className="text-xl text-muted-foreground ml-2">GRT</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display">༆ 𝗦𝗘𝗡𝗗 𝗠𝗢𝗡𝗘𝗬 ༆</CardTitle>
            <CardDescription>Send money to these numbers, then submit your transaction code below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyField label="➪ˢᵃᶠᵃʳⁱᶜᵒᵐ☞" number="0116284050" />
            <CopyField label="➪ᵃⁱʳᵗᵉˡ☞" number="0105521300" />
            <p className="text-sm text-muted-foreground text-center">♲ 𝐀𝐊𝐈𝐃𝐀 𝐑𝐀𝐉𝐀𝐁 ♲</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><Send className="w-5 h-5 text-primary" /> Submit Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Amount (KSH)</Label>
                <Input type="number" min="50" placeholder="50" value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>M-Pesa / Airtel Transaction Code</Label>
                <Input placeholder="e.g. SJK7ABCD12" value={txCode} onChange={e => setTxCode(e.target.value)} required className="font-mono uppercase" />
              </div>
              <div className="space-y-2">
                <Label>Email (optional)</Label>
                <Input type="email" placeholder={user?.email || 'your@email.com'} value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full glow-green gap-2" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Transaction
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                    <div>
                      <span className="font-mono text-sm text-foreground">{tx.transaction_code}</span>
                      <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-semibold text-foreground">{tx.amount} GRT</span>
                      <Badge className={`text-xs ${statusBadge[tx.status] || ''}`}>{tx.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
