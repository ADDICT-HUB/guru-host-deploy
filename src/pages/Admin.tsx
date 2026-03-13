import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Shield, Users, Bot, Wallet, CheckCircle, XCircle, Loader2, Plus, Trash2, Key, BarChart3 } from 'lucide-react';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [bots, setBots] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyType, setNewKeyType] = useState('personal');
  const [newKeyMaxApps, setNewKeyMaxApps] = useState('100');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
        .then(({ data }) => {
          if (!data) { navigate('/dashboard'); return; }
          setIsAdmin(true);
          setLoading(false);
          fetchAll();
        });
    }
  }, [user]);

  const fetchAll = async () => {
    const [txRes, usersRes, botsRes, keysRes] = await Promise.all([
      supabase.from('transactions').select('*, profiles(display_name, email)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('bots').select('*, profiles(display_name, email)').order('created_at', { ascending: false }),
      supabase.from('heroku_api_keys').select('*').order('created_at', { ascending: false }),
    ]);
    setTransactions(txRes.data || []);
    setUsers(usersRes.data || []);
    setBots(botsRes.data || []);
    setApiKeys(keysRes.data || []);
  };

  const approveTransaction = async (tx: any) => {
    setActionLoading(tx.id);
    await supabase.from('transactions').update({ status: 'approved' }).eq('id', tx.id);
    await supabase.rpc('add_balance', { user_id_input: tx.user_id, amount_input: tx.amount });
    toast({ title: 'Approved', description: `${tx.amount} GRT added to user` });
    setActionLoading(null);
    fetchAll();
  };

  const rejectTransaction = async (tx: any) => {
    setActionLoading(tx.id);
    await supabase.from('transactions').update({ status: 'rejected' }).eq('id', tx.id);
    toast({ title: 'Rejected' });
    setActionLoading(null);
    fetchAll();
  };

  const addApiKey = async () => {
    if (!newKeyLabel || !newKeyValue) { toast({ title: 'Fill all fields', variant: 'destructive' }); return; }
    await supabase.from('heroku_api_keys').insert({
      label: newKeyLabel,
      api_key: newKeyValue,
      max_apps: parseInt(newKeyMaxApps) || 100,
      active: true,
    });
    setNewKeyLabel(''); setNewKeyValue(''); setNewKeyMaxApps('100');
    toast({ title: 'API key added' });
    fetchAll();
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm('Delete this API key?')) return;
    await supabase.from('heroku_api_keys').delete().eq('id', id);
    toast({ title: 'Deleted' });
    fetchAll();
  };

  if (loading) return <DashboardLayout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  if (!isAdmin) return null;

  const pendingTx = transactions.filter(t => t.status === 'pending');
  const totalRevenue = transactions.filter(t => t.status === 'approved').reduce((s, t) => s + t.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2"><Shield className="w-8 h-8 text-primary" /> Super Admin</h1>
          <p className="text-muted-foreground">Manage users, payments, bots, and Heroku accounts</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: users.length, icon: Users },
            { label: 'Total Bots', value: bots.length, icon: Bot },
            { label: 'Pending Payments', value: pendingTx.length, icon: Wallet },
            { label: 'Revenue (GRT)', value: totalRevenue, icon: BarChart3 },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-display font-bold text-foreground">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="payments">
          <TabsList className="bg-secondary border border-border">
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="bots">All Bots</TabsTrigger>
            <TabsTrigger value="apikeys">API Keys</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="font-display">Pending Approvals ({pendingTx.length})</CardTitle></CardHeader>
              <CardContent>
                {pendingTx.length === 0 ? <p className="text-muted-foreground text-center py-4">No pending payments</p> : (
                  <div className="space-y-3">
                    {pendingTx.map(tx => (
                      <div key={tx.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-lg bg-secondary/30 border border-border">
                        <div className="flex-1">
                          <p className="font-mono text-sm text-foreground">{tx.transaction_code}</p>
                          <p className="text-xs text-muted-foreground">{tx.profiles?.display_name || tx.profiles?.email} • {tx.amount} KSH • {new Date(tx.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="gap-1" onClick={() => approveTransaction(tx)} disabled={actionLoading === tx.id}>
                            <CheckCircle className="w-3 h-3" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => rejectTransaction(tx)} disabled={actionLoading === tx.id}>
                            <XCircle className="w-3 h-3" /> Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="font-display">All Transactions</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                      <div>
                        <span className="font-mono text-sm text-foreground">{tx.transaction_code}</span>
                        <p className="text-xs text-muted-foreground">{tx.profiles?.display_name || 'User'} • {new Date(tx.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display font-semibold text-foreground">{tx.amount} GRT</span>
                        <Badge className={tx.status === 'approved' ? 'bg-primary/20 text-primary' : tx.status === 'rejected' ? 'bg-destructive/20 text-destructive' : 'bg-guru-yellow/20 text-guru-yellow'}>{tx.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="font-display">All Users ({users.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                      <div>
                        <p className="font-medium text-foreground">{u.display_name || 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-primary">{u.balance || 0} GRT</p>
                        <p className="text-xs text-muted-foreground">Joined {new Date(u.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bots">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="font-display">All Bots ({bots.length})</CardTitle></CardHeader>
              <CardContent>
                {bots.length === 0 ? <p className="text-muted-foreground text-center py-4">No bots deployed</p> : (
                  <div className="space-y-2">
                    {bots.map(b => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                        <div>
                          <p className="font-mono text-sm text-foreground">{b.app_name}</p>
                          <p className="text-xs text-muted-foreground">{b.profiles?.display_name || 'User'}</p>
                        </div>
                        <Badge className={b.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-guru-yellow/20 text-guru-yellow'}>{b.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apikeys" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="font-display flex items-center gap-2"><Key className="w-5 h-5 text-primary" /> Add Heroku API Key</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Label</Label>
                    <Input placeholder="Account name" value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">API Key</Label>
                    <Input placeholder="heroku-api-key" type="password" value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Apps</Label>
                    <Input type="number" value={newKeyMaxApps} onChange={e => setNewKeyMaxApps(e.target.value)} />
                  </div>
                </div>
                <Button className="mt-3 gap-2" onClick={addApiKey}><Plus className="w-4 h-4" /> Add Key</Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="font-display">Heroku Accounts ({apiKeys.length})</CardTitle></CardHeader>
              <CardContent>
                {apiKeys.length === 0 ? <p className="text-muted-foreground text-center py-4">No API keys added</p> : (
                  <div className="space-y-2">
                    {apiKeys.map(k => (
                      <div key={k.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                        <div>
                          <p className="font-medium text-foreground">{k.label}</p>
                          <p className="text-xs text-muted-foreground">Max: {k.max_apps} apps • {k.active ? 'Active' : 'Inactive'}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteApiKey(k.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
