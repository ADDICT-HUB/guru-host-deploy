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
import { Shield, Users, Bot, Wallet, CheckCircle, XCircle, Loader2, Plus, Trash2, Key, BarChart3, Ban, DollarSign, Settings, Package } from 'lucide-react';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [bots, setBots] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [botRepos, setBotRepos] = useState<any[]>([]);
  const [deployCost, setDeployCost] = useState('50');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyMaxApps, setNewKeyMaxApps] = useState('100');
  const [verifyingKey, setVerifyingKey] = useState(false);
  const [keyInfo, setKeyInfo] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [fundUserId, setFundUserId] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  // Bot repo form
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [newRepoSessionVar, setNewRepoSessionVar] = useState('SESSION_ID');

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
    const [txRes, usersRes, botsRes, keysRes, settingsRes, reposRes] = await Promise.all([
      supabase.from('transactions').select('*, profiles(display_name, email)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('bots').select('*, profiles(display_name, email)').order('created_at', { ascending: false }),
      supabase.from('heroku_api_keys').select('*').order('created_at', { ascending: false }),
      supabase.from('platform_settings').select('*'),
      supabase.from('bot_repos').select('*').order('created_at', { ascending: false }),
    ]);
    setTransactions(txRes.data || []);
    setUsers(usersRes.data || []);
    setBots(botsRes.data || []);
    setApiKeys(keysRes.data || []);
    setBotRepos(reposRes.data || []);
    const costSetting = (settingsRes.data || []).find((s: any) => s.key === 'deploy_cost');
    if (costSetting) setDeployCost(costSetting.value);
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

  const verifyApiKey = async () => {
    if (!newKeyValue) { toast({ title: 'Enter API key first', variant: 'destructive' }); return; }
    setVerifyingKey(true);
    setKeyInfo(null);
    const { data, error } = await supabase.functions.invoke('heroku-verify', {
      body: { apiKey: newKeyValue },
    });
    setVerifyingKey(false);
    if (error || !data?.valid) {
      toast({ title: 'Invalid API key', description: data?.error || error?.message, variant: 'destructive' });
      return;
    }
    setKeyInfo(data);
    if (!newKeyLabel) setNewKeyLabel(data.teams?.[0] || data.email?.split('@')[0] || 'Account');
    toast({ title: `✅ Valid ${data.accountType} account`, description: `${data.email} • ${data.appCount} apps` });
  };

  const addApiKey = async () => {
    if (!newKeyLabel || !newKeyValue) { toast({ title: 'Fill all fields', variant: 'destructive' }); return; }
    const accountType = keyInfo?.accountType || 'personal';
    await supabase.from('heroku_api_keys').insert({
      label: newKeyLabel,
      api_key: newKeyValue,
      max_apps: parseInt(newKeyMaxApps) || 100,
      active: true,
      account_type: accountType,
    } as any);
    setNewKeyLabel(''); setNewKeyValue(''); setNewKeyMaxApps('100'); setKeyInfo(null);
    toast({ title: 'API key added' });
    fetchAll();
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm('Delete this API key?')) return;
    await supabase.from('heroku_api_keys').delete().eq('id', id);
    toast({ title: 'Deleted' });
    fetchAll();
  };

  const updateDeployCost = async () => {
    await supabase.from('platform_settings').upsert({ key: 'deploy_cost', value: deployCost, updated_at: new Date().toISOString() });
    toast({ title: 'Deploy cost updated', description: `New cost: ${deployCost} GRT` });
  };

  const toggleBanUser = async (userId: string, currentBanned: boolean) => {
    setActionLoading(userId);
    await supabase.from('profiles').update({ banned: !currentBanned }).eq('id', userId);
    toast({ title: currentBanned ? 'User unbanned' : 'User banned' });
    setActionLoading(null);
    fetchAll();
  };

  const addBotRepo = async () => {
    if (!newRepoName || !newRepoUrl) { toast({ title: 'Fill name and URL', variant: 'destructive' }); return; }
    await supabase.from('bot_repos').insert({
      name: newRepoName,
      repo_url: newRepoUrl,
      description: newRepoDesc || null,
      session_var_name: newRepoSessionVar || 'SESSION_ID',
    } as any);
    setNewRepoName(''); setNewRepoUrl(''); setNewRepoDesc(''); setNewRepoSessionVar('SESSION_ID');
    toast({ title: 'Bot repo added' });
    fetchAll();
  };

  const deleteRepo = async (id: string) => {
    if (!confirm('Delete this bot repo?')) return;
    await supabase.from('bot_repos').delete().eq('id', id);
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
          <p className="text-muted-foreground">Manage users, payments, bots, and platform settings</p>
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
          <TabsList className="bg-secondary border border-border flex-wrap h-auto">
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="bots">All Bots</TabsTrigger>
            <TabsTrigger value="apikeys">API Keys</TabsTrigger>
            <TabsTrigger value="repos">Bot Repos</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Payments Tab */}
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

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="font-display">All Users ({users.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {users.map(u => (
                    <div key={u.id} className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium text-foreground">{u.display_name || 'Unnamed'}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                          {u.banned && <Badge className="bg-destructive/20 text-destructive">Banned</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-display font-bold text-primary">{u.balance || 0} GRT</p>
                            <p className="text-xs text-muted-foreground">Joined {new Date(u.created_at).toLocaleDateString()}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => setFundUserId(fundUserId === u.id ? null : u.id)}
                          >
                            <Wallet className="w-3 h-3" /> Fund
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={u.banned ? 'gap-1 text-primary' : 'gap-1 text-destructive'}
                            onClick={() => toggleBanUser(u.id, u.banned)}
                            disabled={actionLoading === u.id || u.id === user?.id}
                          >
                            <Ban className="w-3 h-3" />
                            {u.banned ? 'Unban' : 'Ban'}
                          </Button>
                        </div>
                      </div>
                      {fundUserId === u.id && (
                        <div className="flex items-end gap-2 pl-3 pb-2">
                          <div className="space-y-1 flex-1">
                            <Label className="text-xs">Amount (GRT) — use negative to deduct</Label>
                            <Input type="number" placeholder="e.g. 100 or -50" value={fundAmount} onChange={e => setFundAmount(e.target.value)} />
                          </div>
                          <Button
                            size="sm"
                            className="gap-1"
                            disabled={!fundAmount || actionLoading === u.id}
                            onClick={async () => {
                              const amount = parseInt(fundAmount);
                              if (!amount) return;
                              setActionLoading(u.id);
                              await supabase.rpc('add_balance', { user_id_input: u.id, amount_input: amount });
                              toast({ title: amount > 0 ? 'Funds added' : 'Funds deducted', description: `${Math.abs(amount)} GRT ${amount > 0 ? 'added to' : 'deducted from'} ${u.display_name || u.email}` });
                              setFundAmount('');
                              setFundUserId(null);
                              setActionLoading(null);
                              fetchAll();
                            }}
                          >
                            <CheckCircle className="w-3 h-3" /> Apply
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bots Tab */}
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

          {/* API Keys Tab */}
          <TabsContent value="apikeys" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="font-display flex items-center gap-2"><Key className="w-5 h-5 text-primary" /> Add Heroku API Key</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">API Key</Label>
                    <Input placeholder="HRKU-..." type="password" value={newKeyValue} onChange={e => { setNewKeyValue(e.target.value); setKeyInfo(null); }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Verify Key</Label>
                    <Button variant="outline" className="w-full gap-2" onClick={verifyApiKey} disabled={verifyingKey || !newKeyValue}>
                      {verifyingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      {verifyingKey ? 'Verifying...' : 'Auto-Detect Type'}
                    </Button>
                  </div>
                </div>

                {keyInfo && (
                  <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm space-y-1">
                    <p className="text-foreground font-medium">✅ Valid Key Detected</p>
                    <p className="text-muted-foreground">Email: {keyInfo.email}</p>
                    <p className="text-muted-foreground">Type: <Badge className={keyInfo.accountType === 'team' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}>{keyInfo.accountType}</Badge></p>
                    {keyInfo.teams?.length > 0 && <p className="text-muted-foreground">Teams: {keyInfo.teams.join(', ')}</p>}
                    <p className="text-muted-foreground">Current Apps: {keyInfo.appCount}</p>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 mt-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Label</Label>
                    <Input placeholder="Account name" value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Apps</Label>
                    <Input type="number" value={newKeyMaxApps} onChange={e => setNewKeyMaxApps(e.target.value)} />
                  </div>
                </div>
                <Button className="mt-3 gap-2" onClick={addApiKey} disabled={!newKeyLabel || !newKeyValue}><Plus className="w-4 h-4" /> Add Key</Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="font-display">Heroku Accounts ({apiKeys.length})</CardTitle></CardHeader>
              <CardContent>
                {apiKeys.length === 0 ? <p className="text-muted-foreground text-center py-4">No API keys added</p> : (
                  <div className="space-y-2">
                    {apiKeys.map(k => (
                      <div key={k.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium text-foreground">{k.label}</p>
                            <p className="text-xs text-muted-foreground">Max: {k.max_apps} apps • {k.active ? 'Active' : 'Inactive'}</p>
                          </div>
                          <Badge className={(k as any).account_type === 'team' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}>{(k as any).account_type || 'personal'}</Badge>
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

          {/* Bot Repos Tab */}
          <TabsContent value="repos" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="font-display flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Add WhatsApp MD Bot</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Bot Name</Label>
                    <Input placeholder="e.g. GURU-MD, Silva-MD" value={newRepoName} onChange={e => setNewRepoName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">GitHub Tarball URL</Label>
                    <Input placeholder="https://github.com/user/repo/tarball/main" value={newRepoUrl} onChange={e => setNewRepoUrl(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input placeholder="Short description" value={newRepoDesc} onChange={e => setNewRepoDesc(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Session Env Var Name</Label>
                    <Input placeholder="SESSION_ID" value={newRepoSessionVar} onChange={e => setNewRepoSessionVar(e.target.value)} />
                  </div>
                </div>
                <Button className="mt-3 gap-2" onClick={addBotRepo} disabled={!newRepoName || !newRepoUrl}><Plus className="w-4 h-4" /> Add Bot Repo</Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="font-display">Available Bots ({botRepos.length})</CardTitle></CardHeader>
              <CardContent>
                {botRepos.length === 0 ? <p className="text-muted-foreground text-center py-4">No bot repos added</p> : (
                  <div className="space-y-2">
                    {botRepos.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                        <div>
                          <p className="font-medium text-foreground">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.description || r.repo_url}</p>
                          <p className="text-xs text-muted-foreground font-mono">Var: {r.session_var_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={r.active ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}>{r.active ? 'Active' : 'Inactive'}</Badge>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteRepo(r.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="font-display flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Platform Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-3">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs flex items-center gap-1"><DollarSign className="w-3 h-3" /> Deploy Cost (GRT)</Label>
                    <Input type="number" value={deployCost} onChange={e => setDeployCost(e.target.value)} />
                  </div>
                  <Button onClick={updateDeployCost} className="gap-2"><CheckCircle className="w-4 h-4" /> Save</Button>
                </div>
                <p className="text-xs text-muted-foreground">This sets the GRT amount deducted per bot deployment.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
