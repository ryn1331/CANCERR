import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Tags } from 'lucide-react';

interface Descriptor {
  id: string;
  category: string;
  code: string;
  label: string;
  parent_code: string | null;
  is_active: boolean;
  sort_order: number;
}

const CATEGORIES = [
  { value: 'type_cancer', label: 'Types de cancer' },
  { value: 'methode_diagnostic', label: 'Méthodes diagnostiques' },
  { value: 'grade', label: 'Grades' },
];

export default function DescriptorsManager() {
  const [descriptors, setDescriptors] = useState<Descriptor[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('type_cancer');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: '', label: '', sort_order: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { fetchDescriptors(); }, [category]);

  const fetchDescriptors = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cancer_descriptors')
      .select('*')
      .eq('category', category)
      .order('sort_order');
    setDescriptors((data as Descriptor[]) || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.code || !form.label) { toast.error('Code et label requis'); return; }

    if (editingId) {
      const { error } = await supabase.from('cancer_descriptors')
        .update({ code: form.code, label: form.label, sort_order: form.sort_order })
        .eq('id', editingId);
      if (error) toast.error(error.message);
      else toast.success('Descripteur modifié');
    } else {
      const { error } = await supabase.from('cancer_descriptors')
        .insert({ category, code: form.code, label: form.label, sort_order: form.sort_order });
      if (error) toast.error(error.message);
      else toast.success('Descripteur ajouté');
    }
    setShowAdd(false);
    setEditingId(null);
    setForm({ code: '', label: '', sort_order: 0 });
    fetchDescriptors();
  };

  const toggleActive = async (d: Descriptor) => {
    const { error } = await supabase.from('cancer_descriptors')
      .update({ is_active: !d.is_active })
      .eq('id', d.id);
    if (error) toast.error(error.message);
    else fetchDescriptors();
  };

  const deleteDescriptor = async (id: string) => {
    const { error } = await supabase.from('cancer_descriptors').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Supprimé'); fetchDescriptors(); }
  };

  const startEdit = (d: Descriptor) => {
    setEditingId(d.id);
    setForm({ code: d.code, label: d.label, sort_order: d.sort_order });
    setShowAdd(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) { setEditingId(null); setForm({ code: '', label: '', sort_order: 0 }); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={14} className="mr-1" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? 'Modifier' : 'Ajouter'} un descripteur</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="poumon" /></div>
              <div><Label>Label</Label><Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Poumon" /></div>
              <div><Label>Ordre</Label><Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} /></div>
              <Button onClick={handleSave} className="w-full">{editingId ? 'Modifier' : 'Ajouter'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
      ) : (
        <div className="space-y-1.5">
          {descriptors.map(d => (
            <div key={d.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2">
                <Badge variant={d.is_active ? 'default' : 'secondary'} className="text-[10px] font-mono">{d.code}</Badge>
                <span className={`text-sm ${!d.is_active ? 'line-through text-muted-foreground' : ''}`}>{d.label}</span>
                <span className="text-[10px] text-muted-foreground">#{d.sort_order}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(d)}>
                  <Tags size={13} className={d.is_active ? 'text-success' : 'text-muted-foreground'} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(d)}>
                  <Pencil size={13} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDescriptor(d.id)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
          {descriptors.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Aucun descripteur</p>}
        </div>
      )}
    </div>
  );
}
