import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Merge, AlertTriangle, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PatientDup {
  id: string;
  nom: string;
  prenom: string;
  date_naissance: string | null;
  num_dossier: string | null;
  code_patient: string;
  commune: string | null;
  case_count: number;
}

interface DuplicateGroup {
  key: string;
  patients: PatientDup[];
}

export default function DuplicatesManager() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [mergeDialog, setMergeDialog] = useState<DuplicateGroup | null>(null);
  const [keepId, setKeepId] = useState<string | null>(null);

  useEffect(() => { detectDuplicates(); }, []);

  const detectDuplicates = async () => {
    setLoading(true);
    const { data: patients } = await supabase
      .from('patients')
      .select('id, nom, prenom, date_naissance, num_dossier, code_patient, commune')
      .order('nom');

    if (!patients) { setLoading(false); return; }

    // Count cases per patient
    const { data: cases } = await supabase.from('cancer_cases').select('patient_id');
    const caseCount: Record<string, number> = {};
    cases?.forEach(c => { caseCount[c.patient_id] = (caseCount[c.patient_id] || 0) + 1; });

    // Group by normalized nom+prenom
    const normalize = (s: string) => s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const groupMap: Record<string, PatientDup[]> = {};

    patients.forEach(p => {
      const key = `${normalize(p.nom)}|${normalize(p.prenom)}`;
      if (!groupMap[key]) groupMap[key] = [];
      groupMap[key].push({ ...p, case_count: caseCount[p.id] || 0 });
    });

    const duplicates = Object.entries(groupMap)
      .filter(([, v]) => v.length > 1)
      .map(([key, patients]) => ({ key, patients }));

    setGroups(duplicates);
    setLoading(false);
  };

  const mergePatients = async () => {
    if (!mergeDialog || !keepId) return;
    setMerging(true);

    const removeIds = mergeDialog.patients.filter(p => p.id !== keepId).map(p => p.id);

    try {
      // Transfer cases, files, rdvs to the kept patient
      for (const removeId of removeIds) {
        await supabase.from('cancer_cases').update({ patient_id: keepId }).eq('patient_id', removeId);
        await supabase.from('patient_files').update({ patient_id: keepId }).eq('patient_id', removeId);
        // Delete the duplicate patient
        await supabase.from('patients').delete().eq('id', removeId);
      }

      toast.success(`${removeIds.length} doublon(s) fusionné(s)`);
      setMergeDialog(null);
      setKeepId(null);
      detectDuplicates();
    } catch (err: any) {
      toast.error(err.message || 'Erreur de fusion');
    } finally {
      setMerging(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {groups.length} groupe(s) de doublons détectés
        </p>
        <Button variant="secondary" size="sm" onClick={detectDuplicates}>Rafraîchir</Button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <User size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun doublon détecté</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <div key={g.key} className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-warning" />
                  <span className="text-sm font-medium">{g.patients[0].nom} {g.patients[0].prenom}</span>
                  <Badge variant="secondary" className="text-[10px]">{g.patients.length} entrées</Badge>
                </div>
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { setMergeDialog(g); setKeepId(g.patients[0].id); }}>
                  <Merge size={12} /> Fusionner
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {g.patients.map(p => (
                  <div key={p.id} className="text-xs p-2 rounded bg-background border border-border/30">
                    <p className="font-medium">{p.nom} {p.prenom}</p>
                    <p className="text-muted-foreground">
                      {p.date_naissance ? new Date(p.date_naissance).toLocaleDateString('fr-DZ') : 'N/A'} · {p.commune || '—'} · {p.case_count} cas
                    </p>
                    <p className="text-muted-foreground font-mono text-[10px]">{p.code_patient}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!mergeDialog} onOpenChange={(o) => { if (!o) setMergeDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fusionner les doublons</DialogTitle></DialogHeader>
          {mergeDialog && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Choisissez le patient à conserver. Les cas des autres seront transférés, puis les doublons supprimés.</p>
              <div className="space-y-2">
                {mergeDialog.patients.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setKeepId(p.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${keepId === p.id ? 'border-primary bg-primary/5' : 'border-border/50 hover:bg-muted/50'}`}
                  >
                    <p className="font-medium text-sm">{p.nom} {p.prenom}</p>
                    <p className="text-xs text-muted-foreground">
                      N° {p.num_dossier || p.code_patient} · {p.case_count} cas · {p.commune || '—'}
                    </p>
                    {keepId === p.id && <Badge className="mt-1 text-[10px] bg-primary/10 text-primary border-primary/20">À conserver</Badge>}
                  </button>
                ))}
              </div>
              <Button onClick={mergePatients} disabled={merging} className="w-full" variant="destructive">
                {merging && <Loader2 size={14} className="mr-1 animate-spin" />}
                Fusionner et supprimer les doublons
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
