import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Power } from 'lucide-react';

interface RefRow {
  id: string;
  libelle?: string;
  nom?: string;
  code: string | null;
  actif: boolean;
  sort_order: number;
  type_categorie?: string;
}

interface ReferenceTableManagerProps {
  tableName: string;
  title: string;
  labelField?: 'libelle' | 'nom';
  showTypeCategorie?: boolean;
}

const db = supabase as any;

export default function ReferenceTableManager({ tableName, title, labelField = 'libelle', showTypeCategorie = false }: ReferenceTableManagerProps) {
  const [rows, setRows] = useState<RefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ label: '', code: '', sort_order: 0, type_categorie: 'solide' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => { fetchRows(); }, [tableName]);

  const fetchRows = async () => {
    setLoading(true);
    const { data } = await db.from(tableName).select('*').order('sort_order');
    setRows((data as RefRow[]) || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.label) { toast.error('Libellé requis'); return; }
    const record: any = { [labelField]: form.label, code: form.code || null, sort_order: form.sort_order };
    if (showTypeCategorie) record.type_categorie = form.type_categorie;

    if (editingId) {
      const { error } = await db.from(tableName).update(record).eq('id', editingId);
      if (error) toast.error(error.message);
      else toast.success('Modifié');
    } else {
      const { error } = await db.from(tableName).insert(record);
      if (error) toast.error(error.message);
      else toast.success('Ajouté');
    }
    setShowAdd(false);
    setEditingId(null);
    setForm({ label: '', code: '', sort_order: 0, type_categorie: 'solide' });
    fetchRows();
  };

  const toggleActive = async (row: RefRow) => {
    const { error } = await db.from(tableName).update({ actif: !row.actif }).eq('id', row.id);
    if (error) toast.error(error.message);
    else fetchRows();
  };

  const deleteRow = async (id: string) => {
    const { error } = await db.from(tableName).delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Supprimé'); fetchRows(); }
  };

  const startEdit = (row: RefRow) => {
    setEditingId(row.id);
    setForm({
      label: (row as any)[labelField] || '',
      code: row.code || '',
      sort_order: row.sort_order,
      type_categorie: row.type_categorie || 'solide',
    });
    setShowAdd(true);
  };

  const getLabel = (row: RefRow) => (row as any)[labelField] || '';

  const filteredRows = showTypeCategorie && filterType !== 'all'
    ? rows.filter(r => r.type_categorie === filterType)
    : rows;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h4 className="text-sm font-semibold">{title} ({rows.length})</h4>
        <div className="flex items-center gap-2">
          {showTypeCategorie && (
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="solide">Solides</SelectItem>
                <SelectItem value="liquide">Hémopathies</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) { setEditingId(null); setForm({ label: '', code: '', sort_order: 0, type_categorie: 'solide' }); } }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus size={14} className="mr-1" /> Ajouter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingId ? 'Modifier' : 'Ajouter'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Libellé / Nom *</Label><Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} /></div>
                <div><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Optionnel" /></div>
                {showTypeCategorie && (
                  <div>
                    <Label>Type</Label>
                    <Select value={form.type_categorie} onValueChange={v => setForm(f => ({ ...f, type_categorie: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solide">Cancer solide</SelectItem>
                        <SelectItem value="liquide">Hémopathie (liquide)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div><Label>Ordre</Label><Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} /></div>
                <Button onClick={handleSave} className="w-full">{editingId ? 'Modifier' : 'Ajouter'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {filteredRows.map(row => (
            <div key={row.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 min-w-0">
                {row.code && <Badge variant="outline" className="text-[10px] font-mono shrink-0">{row.code}</Badge>}
                <span className={`text-sm truncate ${!row.actif ? 'line-through text-muted-foreground' : ''}`}>{getLabel(row)}</span>
                {showTypeCategorie && row.type_categorie === 'liquide' && (
                  <Badge variant="secondary" className="text-[9px]">Hémopathie</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(row)}>
                  <Power size={13} className={row.actif ? 'text-success' : 'text-muted-foreground'} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(row)}>
                  <Pencil size={13} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRow(row.id)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
          {filteredRows.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Aucune entrée</p>}
        </div>
      )}
    </div>
  );
}
