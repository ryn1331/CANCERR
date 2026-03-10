import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import {
  TrendingUp, FileText, Users, MapPin, Plus, ArrowUpRight, Calendar,
  BarChart3, Activity, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import AppLayout from '@/components/layout/AppLayout';
import TlemcenMap from '@/components/TlemcenMap';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CANCER_COLORS = [
  'hsl(213, 80%, 45%)',
  'hsl(170, 60%, 42%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(340, 65%, 50%)',
  'hsl(25, 85%, 52%)',
];

const GENDER_COLORS = { M: 'hsl(213, 80%, 50%)', F: 'hsl(340, 65%, 50%)' };

/* ── Tooltip personnalisé ── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name || p.dataKey}:</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { role, fullName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [mapData, setMapData] = useState<{ commune: string | null; count: number }[]>([]);
  const [rawMapCases, setRawMapCases] = useState<Array<{ commune: string | null; type_cancer: string; sexe: string | null; date_diagnostic: string }>>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        supabase.from('cancer_cases').select('id, type_cancer, date_diagnostic, statut, patients(commune, sexe, date_naissance)'),
        supabase.from('patients').select('id, sexe, created_at'),
      ]);

      const casesData = (cRes.data as any[]) || [];
      setCases(casesData);
      setPatients((pRes.data as any[]) || []);

      const communeCounts: Record<string, number> = {};
      casesData.forEach((c: any) => {
        const commune = c.patients?.commune;
        if (commune) communeCounts[commune] = (communeCounts[commune] || 0) + 1;
      });
      setMapData(Object.entries(communeCounts).map(([commune, count]) => ({ commune, count })));
      setRawMapCases(casesData.map((c: any) => ({
        commune: c.patients?.commune || null,
        type_cancer: c.type_cancer,
        sexe: c.patients?.sexe || null,
        date_diagnostic: c.date_diagnostic,
      })));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Derived data ── */
  const totalCases = cases.length;
  const totalPatients = patients.length;
  const maleCount = cases.filter((c: any) => c.patients?.sexe === 'M').length;
  const femaleCount = cases.filter((c: any) => c.patients?.sexe === 'F').length;
  const communeCount = new Set(cases.map((c: any) => c.patients?.commune).filter(Boolean)).size;

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    cases.forEach((c: any) => { counts[c.type_cancer] = (counts[c.type_cancer] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([name, value]) => ({ name, value }));
  }, [cases]);

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  const monthlyData = useMemo(() => {
    const mCounts: Record<string, { cas: number; M: number; F: number }> = {};
    months.forEach(m => { mCounts[m] = { cas: 0, M: 0, F: 0 }; });
    cases.forEach((c: any) => {
      const m = months[new Date(c.date_diagnostic).getMonth()];
      if (mCounts[m]) {
        mCounts[m].cas++;
        if (c.patients?.sexe === 'M') mCounts[m].M++;
        else if (c.patients?.sexe === 'F') mCounts[m].F++;
      }
    });
    return months.map(m => ({ name: m, ...mCounts[m] }));
  }, [cases]);

  /* Age distribution */
  const ageData = useMemo(() => {
    const brackets = ['0-14', '15-29', '30-44', '45-59', '60-74', '75+'];
    const counts: Record<string, { M: number; F: number }> = {};
    brackets.forEach(b => { counts[b] = { M: 0, F: 0 }; });
    cases.forEach((c: any) => {
      const dob = c.patients?.date_naissance;
      if (!dob) return;
      const age = new Date().getFullYear() - new Date(dob).getFullYear();
      let bracket = '75+';
      if (age < 15) bracket = '0-14';
      else if (age < 30) bracket = '15-29';
      else if (age < 45) bracket = '30-44';
      else if (age < 60) bracket = '45-59';
      else if (age < 75) bracket = '60-74';
      counts[bracket][c.patients?.sexe === 'F' ? 'F' : 'M']++;
    });
    return brackets.map(b => ({ age: b, Hommes: counts[b].M, Femmes: counts[b].F }));
  }, [cases]);

  /* Recent cases */
  const recentCases = useMemo(() =>
    [...cases]
      .sort((a: any, b: any) => new Date(b.date_diagnostic).getTime() - new Date(a.date_diagnostic).getTime())
      .slice(0, 5),
  [cases]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* ══════════ Hero Banner ══════════ */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(215,32%,10%)] via-[hsl(213,80%,22%)] to-[hsl(170,60%,20%)]">
          {/* Mesh overlay */}
          <div className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `
                radial-gradient(circle at 15% 50%, hsl(213 80% 45% / 0.35) 0%, transparent 50%),
                radial-gradient(circle at 85% 30%, hsl(170 60% 42% / 0.25) 0%, transparent 50%),
                radial-gradient(circle at 50% 80%, hsl(200 75% 52% / 0.15) 0%, transparent 50%)
              `,
            }}
          />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/60 text-[11px] mb-3">
                <Activity size={11} className="text-emerald-400" />
                {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
              </div>
              <p className="text-white/60 text-sm font-medium">{greeting()}, {fullName || 'Docteur'}</p>
              <h1 className="font-display text-2xl md:text-3xl font-bold mt-1 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-cyan-200">
                Tableau de Bord
              </h1>
              <p className="text-white/40 text-sm mt-2 max-w-md">
                Registre du Cancer — Wilaya de Tlemcen
              </p>
            </div>
            <Link to="/nouveau-cas">
              <Button className="gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white shadow-none h-10">
                <Plus size={16} /> Nouveau cas
              </Button>
            </Link>
          </div>
        </div>

        {/* ══════════ KPI Cards ══════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: 'Total Cas', value: totalCases, icon: FileText, color: 'text-primary', gradient: 'from-primary/10 to-primary/5', ring: 'ring-primary/20' },
            { label: 'Patients', value: totalPatients, icon: Users, color: 'text-emerald-500', gradient: 'from-emerald-500/10 to-emerald-500/5', ring: 'ring-emerald-500/20' },
            { label: 'Communes', value: communeCount, icon: MapPin, color: 'text-amber-500', gradient: 'from-amber-500/10 to-amber-500/5', ring: 'ring-amber-500/20' },
            { label: 'Ratio H/F', value: femaleCount > 0 ? `${(maleCount / femaleCount).toFixed(1)}` : '—', icon: TrendingUp, color: 'text-violet-500', gradient: 'from-violet-500/10 to-violet-500/5', ring: 'ring-violet-500/20' },
          ].map(kpi => (
            <div key={kpi.label} className="group relative bg-card rounded-xl border border-border/50 p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 overflow-hidden">
              {/* Subtle gradient bg */}
              <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500', kpi.gradient)} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center ring-1', kpi.gradient, kpi.ring)}>
                    <kpi.icon size={18} className={kpi.color} />
                  </div>
                  <ArrowUpRight size={14} className="text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all" />
                </div>
                <p className="text-3xl font-display font-bold tracking-tight">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ══════════ Charts Row 1 ══════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">

          {/* Incidence mensuelle — span 2 */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border/50 p-5 md:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display font-semibold text-base">Incidence Mensuelle</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Répartition par sexe — {new Date().getFullYear()}</p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: GENDER_COLORS.M }} />Hommes</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: GENDER_COLORS.F }} />Femmes</span>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="areaM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GENDER_COLORS.M} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={GENDER_COLORS.M} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="areaF" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GENDER_COLORS.F} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={GENDER_COLORS.F} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="M" name="Hommes" stroke={GENDER_COLORS.M} strokeWidth={2.5} fill="url(#areaM)" dot={{ r: 3, fill: GENDER_COLORS.M, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="F" name="Femmes" stroke={GENDER_COLORS.F} strokeWidth={2.5} fill="url(#areaF)" dot={{ r: 3, fill: GENDER_COLORS.F, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top types — donut */}
          <div className="bg-card rounded-xl border border-border/50 p-5 md:p-6">
            <div className="mb-4">
              <h3 className="font-display font-semibold text-base">Types de Cancer</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{totalCases} cas enregistrés</p>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    paddingAngle={3} dataKey="value"
                    stroke="hsl(var(--card))" strokeWidth={3}
                  >
                    {typeData.map((_, i) => (
                      <Cell key={i} fill={CANCER_COLORS[i % CANCER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="space-y-1.5 mt-2">
              {typeData.slice(0, 5).map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CANCER_COLORS[i] }} />
                    <span className="text-muted-foreground truncate">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{d.value}</span>
                    <span className="text-muted-foreground/60 w-10 text-right">{totalCases > 0 ? ((d.value / totalCases) * 100).toFixed(0) : 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════ Charts Row 2 ══════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">

          {/* Age / Sex distribution */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border/50 p-5 md:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display font-semibold text-base">Distribution par Âge et Sexe</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Pyramide des âges des cas</p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: GENDER_COLORS.M }} />Hommes</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: GENDER_COLORS.F }} />Femmes</span>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Hommes" fill={GENDER_COLORS.M} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Femmes" fill={GENDER_COLORS.F} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent cases */}
          <div className="bg-card rounded-xl border border-border/50 p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-semibold text-base">Cas Récents</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Derniers enregistrements</p>
              </div>
              <Link to="/cas">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-7">
                  <BarChart3 size={12} /> Tout voir
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {recentCases.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Aucun cas enregistré</p>
              ) : (
                recentCases.map((c: any) => (
                  <Link key={c.id} to={`/dossier-cancer/${c.id}`} className="block">
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                        c.patients?.sexe === 'F' ? 'bg-pink-500/10 text-pink-600' : 'bg-blue-500/10 text-blue-600'
                      )}>
                        {c.patients?.sexe === 'F' ? '♀' : '♂'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.type_cancer}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {c.patients?.commune || 'N/A'} · {new Date(c.date_diagnostic).toLocaleDateString('fr-DZ')}
                        </p>
                      </div>
                      <ArrowUpRight size={14} className="text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all shrink-0" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ══════════ Map ══════════ */}
        <div className="bg-card rounded-xl border border-border/50 p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-semibold text-base">Carte Épidémiologique</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Répartition géographique — Wilaya de Tlemcen</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <MapPin size={12} />
              {communeCount} commune{communeCount > 1 ? 's' : ''} touchée{communeCount > 1 ? 's' : ''}
            </div>
          </div>
          <div className="h-[400px] md:h-[500px] rounded-xl overflow-hidden border border-border/30">
            <TlemcenMap casesByCommune={mapData} rawCases={rawMapCases} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
