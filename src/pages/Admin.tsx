import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Shield, Users, Building2, Stethoscope, Tags, Plus, Settings, ListChecks, MapPin, HeartPulse, FileWarning, UserPlus, KeyRound, Trash2, Mail } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { SERVICES_MEDICAUX, SPECIALITES } from '@/lib/wilayas';
import DescriptorsManager from '@/components/admin/DescriptorsManager';
import ReferenceTableManager from '@/components/admin/ReferenceTableManager';

interface UserRow {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  service: string | null;
  specialite: string | null;
}

export default function Admin() {
  const { role, user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '', role: 'medecin' as string });
  const [resetPwUserId, setResetPwUserId] = useState<string | null>(null);
  const [resetPwValue, setResetPwValue] = useState('');
  const [resettingPw, setResettingPw] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (role === 'admin') fetchData();
  }, [role]);

  // Only admin can access
  if (role && role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const fetchData = async () => {
    const usersRes = await supabase.from('profiles').select('user_id, full_name, service, specialite');

    if (usersRes.data) {
      const rolesRes = await supabase.from('user_roles').select('user_id, role');
      const roleMap: Record<string, string> = {};
      rolesRes.data?.forEach((r: any) => { roleMap[r.user_id] = r.role; });

      // Fetch emails via admin-users edge function
      let emailMap: Record<string, string> = {};
      try {
        const { data: emailData } = await supabase.functions.invoke('admin-users', {
          body: { action: 'list' },
        });
        if (emailData?.users) {
          emailData.users.forEach((u: any) => { emailMap[u.id] = u.email; });
        }
      } catch {}

      setUsers(usersRes.data.map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: emailMap[p.user_id] || '',
        role: roleMap[p.user_id] || 'medecin',
        service: p.service || null,
        specialite: p.specialite || null,
      })));
    }

    setLoading(false);
  };

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole as any })
      .eq('user_id', userId);

    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success('Rôle mis à jour');
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, role: newRole } : u));
    }
  };

  const updateProfile = async (userId: string, field: 'service' | 'specialite', value: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: value || null })
      .eq('user_id', userId);

    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success(`${field === 'service' ? 'Service' : 'Spécialité'} mis à jour`);
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, [field]: value } : u));
    }
  };

  const createAccount = async () => {
    if (!newUser.email || !newUser.password || !newUser.fullName) {
      toast.error('Tous les champs sont obligatoires');
      return;
    }
    if (newUser.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setCreatingUser(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: { full_name: newUser.fullName, role: newUser.role },
        },
      });
      if (error) throw error;
      toast.success(`Compte créé pour ${newUser.email}`);
      setShowCreateUser(false);
      setNewUser({ email: '', password: '', fullName: '', role: 'medecin' });
      setTimeout(() => fetchData(), 1000);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création du compte');
    } finally {
      setCreatingUser(false);
    }
  };

  const resetPassword = async () => {
    if (!resetPwUserId || !resetPwValue) return;
    if (resetPwValue.length < 6) { toast.error('Min. 6 caractères'); return; }
    setResettingPw(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'reset-password', userId: resetPwUserId, password: resetPwValue },
      });
      if (data?.error) throw new Error(data.error);
      if (error) throw error;
      toast.success('Mot de passe réinitialisé');
      setResetPwUserId(null);
      setResetPwValue('');
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally { setResettingPw(false); }
  };

  const deleteUser = async (userId: string) => {
    setDeletingUserId(userId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'delete', userId },
      });
      if (data?.error) throw new Error(data.error);
      if (error) throw error;
      toast.success('Compte supprimé');
      setUsers(prev => prev.filter(u => u.user_id !== userId));
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally { setDeletingUserId(null); }
  };

  const roleLabel = (r: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrateur', medecin: 'Médecin', epidemiologiste: 'Épidémiologiste',
      anapath: 'Anatomopathologiste', assistante: 'Assistante Médicale',
    };
    return labels[r] || r;
  };

  if (loading) return (
    <AppLayout>
      <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="text-primary" size={24} />
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold">Administration</h1>
            <p className="text-muted-foreground text-sm">Gestion des utilisateurs et paramétrage</p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="users" className="gap-1 text-xs"><Users size={13} /> Utilisateurs</TabsTrigger>
            <TabsTrigger value="descriptors" className="gap-1 text-xs"><Tags size={13} /> Descripteurs</TabsTrigger>
            <TabsTrigger value="parametrage" className="gap-1 text-xs"><ListChecks size={13} /> Paramétrage</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1 text-xs"><Settings size={13} /> Paramètres</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            {/* Create Account */}
            <div className="mb-4">
              <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                <DialogTrigger asChild>
                  <Button className="w-full h-11 gap-2"><UserPlus size={16} /> Créer un compte utilisateur</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nouveau compte</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Nom complet *</Label><Input value={newUser.fullName} onChange={e => setNewUser(f => ({ ...f, fullName: e.target.value }))} placeholder="Dr. Ahmed Benali" /></div>
                    <div><Label>Email *</Label><Input type="email" value={newUser.email} onChange={e => setNewUser(f => ({ ...f, email: e.target.value }))} placeholder="medecin@chu-tlemcen.dz" /></div>
                    <div><Label>Mot de passe *</Label><Input type="text" value={newUser.password} onChange={e => setNewUser(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 caractères" /></div>
                    <div><Label>Rôle *</Label>
                      <Select value={newUser.role} onValueChange={v => setNewUser(f => ({ ...f, role: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="medecin">Médecin (Clinicien)</SelectItem>
                          <SelectItem value="epidemiologiste">Épidémiologiste</SelectItem>
                          <SelectItem value="anapath">Anatomopathologiste</SelectItem>
                          <SelectItem value="assistante">Assistante Médicale</SelectItem>
                          <SelectItem value="admin">Administrateur</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={createAccount} disabled={creatingUser} className="w-full">
                      {creatingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Créer le compte
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Users Management */}
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-4">
                <Users size={18} className="text-primary" />
                <h3 className="font-display font-semibold">Utilisateurs ({users.length})</h3>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Nom</th>
                      <th className="pb-3 font-medium">Email</th>
                      <th className="pb-3 font-medium">Rôle</th>
                      <th className="pb-3 font-medium">Service</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.user_id} className="border-b border-border/50">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                              {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="font-medium">{u.full_name || 'Sans nom'}</span>
                            {u.user_id === user?.id && <Badge variant="secondary" className="text-[10px]">Vous</Badge>}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail size={12} />{u.email}</span>
                        </td>
                        <td className="py-3">
                          <Select value={u.role} onValueChange={(v) => updateRole(u.user_id, v)} disabled={u.user_id === user?.id}>
                            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrateur</SelectItem>
                              <SelectItem value="medecin">Médecin</SelectItem>
                              <SelectItem value="epidemiologiste">Épidémiologiste</SelectItem>
                              <SelectItem value="anapath">Anatomopathologiste</SelectItem>
                              <SelectItem value="assistante">Assistante Médicale</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3">
                          <Select value={u.service || ''} onValueChange={(v) => updateProfile(u.user_id, 'service', v)}>
                            <SelectTrigger className="w-36"><SelectValue placeholder="Aucun" /></SelectTrigger>
                            <SelectContent>
                              {SERVICES_MEDICAUX.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <Dialog open={resetPwUserId === u.user_id} onOpenChange={(open) => { if (!open) { setResetPwUserId(null); setResetPwValue(''); } }}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Réinitialiser le mot de passe" onClick={() => setResetPwUserId(u.user_id)}>
                                  <KeyRound size={14} />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Réinitialiser le mot de passe</DialogTitle></DialogHeader>
                                <p className="text-sm text-muted-foreground">Pour : <strong>{u.full_name}</strong> ({u.email})</p>
                                <div className="space-y-3">
                                  <div><Label>Nouveau mot de passe *</Label><Input type="text" value={resetPwValue} onChange={e => setResetPwValue(e.target.value)} placeholder="Min. 6 caractères" /></div>
                                  <Button onClick={resetPassword} disabled={resettingPw} className="w-full">
                                    {resettingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Réinitialiser
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            {u.user_id !== user?.id && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Supprimer le compte"
                                disabled={deletingUserId === u.user_id}
                                onClick={() => { if (confirm(`Supprimer le compte de ${u.full_name} (${u.email}) ?`)) deleteUser(u.user_id); }}>
                                {deletingUserId === u.user_id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {users.map((u) => (
                  <div key={u.user_id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                          {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <span className="font-medium text-sm">{u.full_name || 'Sans nom'}</span>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail size={10} />{u.email}</p>
                          {u.service && <p className="text-[10px] text-muted-foreground">{u.service}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {u.user_id === user?.id && <Badge variant="secondary" className="text-[10px]">Vous</Badge>}
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Réinitialiser MDP" onClick={() => setResetPwUserId(u.user_id)}><KeyRound size={13} /></Button>
                        {u.user_id !== user?.id && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Supprimer"
                            disabled={deletingUserId === u.user_id}
                            onClick={() => { if (confirm(`Supprimer ${u.full_name} ?`)) deleteUser(u.user_id); }}>
                            {deletingUserId === u.user_id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </Button>
                        )}
                      </div>
                    </div>
                    <Select value={u.role} onValueChange={(v) => updateRole(u.user_id, v)} disabled={u.user_id === user?.id}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrateur</SelectItem>
                        <SelectItem value="medecin">Médecin</SelectItem>
                        <SelectItem value="epidemiologiste">Épidémiologiste</SelectItem>
                        <SelectItem value="anapath">Anatomopathologiste</SelectItem>
                        <SelectItem value="assistante">Assistante Médicale</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={u.service || ''} onValueChange={(v) => updateProfile(u.user_id, 'service', v)}>
                      <SelectTrigger><SelectValue placeholder="Service..." /></SelectTrigger>
                      <SelectContent>{SERVICES_MEDICAUX.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="descriptors">
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-4">
                <Tags size={18} className="text-primary" />
                <h3 className="font-display font-semibold">Descripteurs Cancer</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Gérez dynamiquement les types de cancer, méthodes diagnostiques et grades disponibles dans le formulaire.</p>
              <DescriptorsManager />
            </div>
          </TabsContent>

          <TabsContent value="parametrage">
            <div className="space-y-6">
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-4">
                  <Stethoscope size={18} className="text-primary" />
                  <h3 className="font-display font-semibold">Cancers & Hémopathies</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Gérez la liste des cancers solides et hémopathies malignes (liquides). Ces valeurs alimentent les formulaires.</p>
                <ReferenceTableManager tableName="cancers_ref" title="Cancers" labelField="nom" showTypeCategorie />
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-2 mb-4">
                  <FileWarning size={18} className="text-destructive" />
                  <h3 className="font-display font-semibold">Effets Indésirables Graves</h3>
                </div>
                <ReferenceTableManager tableName="effets_indesirables" title="Effets indésirables" labelField="libelle" />
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-2 mb-4">
                  <HeartPulse size={18} className="text-chart-3" />
                  <h3 className="font-display font-semibold">Antécédents</h3>
                </div>
                <ReferenceTableManager tableName="antecedents_ref" title="Antécédents" labelField="libelle" />
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-2 mb-4">
                  <ListChecks size={18} className="text-chart-5" />
                  <h3 className="font-display font-semibold">Comorbidités</h3>
                </div>
                <ReferenceTableManager tableName="comorbidites_ref" title="Comorbidités" labelField="libelle" />
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin size={18} className="text-accent" />
                  <h3 className="font-display font-semibold">Localités</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Gérez les localités et leurs codes pour le registre.</p>
                <ReferenceTableManager tableName="localites_ref" title="Localités" labelField="nom" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="stat-card space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings size={18} className="text-primary" />
                <h3 className="font-display font-semibold">Paramètres du Registre</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Configurez les descripteurs dans l'onglet dédié. Les utilisateurs et rôles sont gérés dans l'onglet Utilisateurs.
                Pour ajouter de nouveaux champs au formulaire, utilisez l'onglet Descripteurs pour créer de nouveaux types de cancer, 
                méthodes de diagnostic, grades, et sous-types.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2"><Tags size={14} className="text-primary" /> Types de Cancer</h4>
                  <p className="text-xs text-muted-foreground">Ajoutez/modifiez les types dans Descripteurs → type_cancer</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2"><Stethoscope size={14} className="text-primary" /> Méthodes Diagnostic</h4>
                  <p className="text-xs text-muted-foreground">Gérez via Descripteurs → methode_diagnostic</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2"><Shield size={14} className="text-primary" /> Grades</h4>
                  <p className="text-xs text-muted-foreground">Configurez via Descripteurs → grade</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2"><Plus size={14} className="text-primary" /> Sous-Types</h4>
                  <p className="text-xs text-muted-foreground">Ajoutez dans Descripteurs → sous_type avec un parent_code</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
