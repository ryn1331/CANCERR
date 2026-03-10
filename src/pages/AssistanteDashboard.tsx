import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { Loader2, UserPlus, Search, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PatientRow {
  id: string; nom: string; prenom: string; sexe: string; date_naissance: string | null;
  commune: string | null; telephone: string | null; code_patient: string; num_dossier: string | null;
  created_at: string;
}

export default function Assistante() {
  const { fullName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.from('patients').select('*').order('created_at', { ascending: false }).then(pRes => {
      setPatients((pRes.data as PatientRow[]) || []);
      setLoading(false);
    });
  }, []);

  const filteredPatients = useMemo(() =>
    patients.filter(p =>
      search === '' ||
      p.nom.toLowerCase().includes(search.toLowerCase()) ||
      p.prenom.toLowerCase().includes(search.toLowerCase()) ||
      p.code_patient.toLowerCase().includes(search.toLowerCase()) ||
      p.num_dossier?.toLowerCase().includes(search.toLowerCase()) ||
      p.telephone?.includes(search)
    ),
  [patients, search]);

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  };

  if (loading) return (
    <AppLayout>
      <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="hero-banner p-5 md:p-6 text-white">
          <div className="relative z-10">
            <p className="text-white/70 text-sm">{greeting()}, {fullName || 'Assistante'}</p>
            <h1 className="font-display text-xl md:text-2xl font-bold mt-1 text-gradient-hero">
              Espace Assistante
            </h1>
            <p className="text-white/60 text-xs mt-1">
              {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>

        {/* Quick KPIs */}
        <div className="grid grid-cols-1 gap-3">
          <div className="kpi-card text-center">
            <Users size={20} className={cn('mx-auto mb-1', 'text-primary')} />
            <p className={cn('text-2xl font-display font-bold', 'text-primary')}>{patients.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Patients enregistrés</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Link to="/nouveau-cas">
            <Button className="gap-1.5">
              <UserPlus size={16} /> Nouveau Patient
            </Button>
          </Link>
        </div>

        {/* Patients */}
        <div>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher par nom, code, n° dossier, téléphone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="space-y-2">
            {filteredPatients.slice(0, 30).map(p => (
              <div key={p.id} className="stat-card !py-3 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {p.nom.charAt(0)}{p.prenom.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{p.nom} {p.prenom}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.sexe === 'M' ? '♂' : '♀'} · {p.commune || 'N/A'}
                    {p.num_dossier && ` · Dossier: ${p.num_dossier}`}
                    {p.telephone && ` · ${p.telephone}`}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {p.code_patient}
                </span>
                <Link to={`/dossier-patient/${p.id}`}>
                  <Button variant="ghost" size="sm" className="h-8">
                    <ArrowRight size={14} />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}