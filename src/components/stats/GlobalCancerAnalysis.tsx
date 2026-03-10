import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, TrendingUp, AlertTriangle, BookOpen, Download } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CANCER_TYPES = [
  { value: 'Cancer du poumon', label: '🫁 Cancer du poumon' },
  { value: 'Cancer du sein', label: '🎀 Cancer du sein' },
  { value: 'Cancer colorectal', label: '🔬 Cancer colorectal' },
  { value: 'Cancer de la prostate', label: '♂️ Cancer de la prostate' },
  { value: 'Cancer de l\'estomac', label: '🏥 Cancer de l\'estomac' },
  { value: 'Cancer du foie', label: '🫀 Cancer du foie' },
  { value: 'Cancer de la vessie', label: '💧 Cancer de la vessie' },
  { value: 'Cancer du col utérin', label: '🩺 Cancer du col utérin' },
  { value: 'Cancer de la thyroïde', label: '🦋 Cancer de la thyroïde' },
  { value: 'Lymphome non hodgkinien', label: '🧬 Lymphome non hodgkinien' },
  { value: 'Leucémie', label: '🩸 Leucémie' },
  { value: 'Mélanome', label: '☀️ Mélanome' },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];

interface AnalysisData {
  cancer_type_label: string;
  summary: string;
  global_overview: {
    total_cases_2022: number;
    total_deaths_2022: number;
    asr_incidence: number;
    asr_mortality: number;
    rank_worldwide: number;
    percentage_all_cancers: number;
  };
  historical_data: Array<{
    year: number;
    world_incidence: number;
    world_mortality: number;
    africa_incidence: number;
    north_africa_incidence: number;
    algeria_incidence: number;
    algeria_mortality: number;
    asr_world: number;
    asr_algeria: number;
  }>;
  predictions: Array<{
    year: number;
    world_incidence: number;
    algeria_incidence: number;
    algeria_mortality: number;
    asr_algeria: number;
    confidence_lower: number;
    confidence_upper: number;
  }>;
  regional_comparison: Array<{
    region: string;
    asr_incidence: number;
    asr_mortality: number;
    trend: string;
  }>;
  risk_factors: Array<{
    factor: string;
    impact: string;
    prevalence_algeria: string;
    description: string;
  }>;
  age_distribution: Array<{ age_group: string; percentage: number }>;
  sex_ratio: { male_percentage: number; female_percentage: number };
  methodology: string;
  recommendations: string[];
  sources: string[];
}

export default function GlobalCancerAnalysis() {
  const [cancerType, setCancerType] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalysisData | null>(null);

  const analyze = async () => {
    if (!cancerType) { toast.error('Sélectionnez un type de cancer'); return; }
    setLoading(true);
    setData(null);
    try {
      const { data: res, error } = await supabase.functions.invoke('analyze-global-cancer', {
        body: { cancer_type: cancerType },
      });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      setData(res.analysis);
      toast.success('Analyse terminée');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'analyse');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Analyse Mondiale - ${data.cancer_type_label}`, 14, 20);
    doc.setFontSize(10);
    doc.text('Sources: GLOBOCAN 2022, IARC, OMS', 14, 28);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 34);

    doc.setFontSize(12);
    doc.text('Aperçu Global 2022', 14, 46);
    autoTable(doc, {
      startY: 50,
      head: [['Indicateur', 'Valeur']],
      body: [
        ['Nouveaux cas', data.global_overview.total_cases_2022.toLocaleString('fr-FR')],
        ['Décès', data.global_overview.total_deaths_2022.toLocaleString('fr-FR')],
        ['ASR Incidence', `${data.global_overview.asr_incidence}/100k`],
        ['ASR Mortalité', `${data.global_overview.asr_mortality}/100k`],
        ['Rang mondial', `#${data.global_overview.rank_worldwide}`],
      ],
    });

    const y1 = (doc as any).lastAutoTable?.finalY || 100;
    doc.text('Données Historiques', 14, y1 + 10);
    autoTable(doc, {
      startY: y1 + 14,
      head: [['Année', 'Monde Inc.', 'Algérie Inc.', 'Algérie Mort.', 'ASR Algérie']],
      body: data.historical_data.map(r => [
        r.year, r.world_incidence?.toLocaleString('fr-FR'), r.algeria_incidence?.toLocaleString('fr-FR'),
        r.algeria_mortality?.toLocaleString('fr-FR'), r.asr_algeria?.toFixed(1),
      ]),
      styles: { fontSize: 7 },
    });

    doc.addPage();
    doc.text('Prédictions 2025-2030', 14, 20);
    autoTable(doc, {
      startY: 24,
      head: [['Année', 'Algérie Inc.', 'Algérie Mort.', 'ASR', 'IC 95%']],
      body: data.predictions.map(r => [
        r.year, r.algeria_incidence?.toLocaleString('fr-FR'), r.algeria_mortality?.toLocaleString('fr-FR'),
        r.asr_algeria?.toFixed(1), `[${r.confidence_lower?.toFixed(1)} - ${r.confidence_upper?.toFixed(1)}]`,
      ]),
    });

    const y2 = (doc as any).lastAutoTable?.finalY || 80;
    doc.text('Recommandations', 14, y2 + 10);
    data.recommendations.forEach((r, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${r}`, 180);
      doc.text(lines, 14, y2 + 16 + i * 8);
    });

    doc.save(`analyse-${cancerType.replace(/\s/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('PDF exporté');
  };

  const trendChartData = data ? [
    ...data.historical_data.map(d => ({ ...d, type: 'Historique' })),
    ...data.predictions.map(d => ({ year: d.year, algeria_incidence: d.algeria_incidence, algeria_mortality: d.algeria_mortality, asr_algeria: d.asr_algeria, world_incidence: d.world_incidence, type: 'Prédiction' })),
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Globe className="text-primary" size={22} />
                Analyse Mondiale & Prédictions
              </h2>
              <p className="text-sm text-muted-foreground">
                Données GLOBOCAN 2022 · IARC CI5 · Registres Algériens · Prédictions 5 ans
              </p>
            </div>
            <div className="flex gap-3 items-end">
              <div className="w-64">
                <Select value={cancerType} onValueChange={setCancerType}>
                  <SelectTrigger><SelectValue placeholder="Type de cancer..." /></SelectTrigger>
                  <SelectContent>
                    {CANCER_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={analyze} disabled={loading || !cancerType} className="gap-2">
                {loading ? <Loader2 className="animate-spin" size={16} /> : <TrendingUp size={16} />}
                {loading ? 'Analyse en cours...' : 'Analyser'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-primary" size={40} />
          <p className="text-muted-foreground">Analyse des registres internationaux en cours...</p>
          <p className="text-xs text-muted-foreground">GLOBOCAN · IARC · SEER · WHO · Registres Algériens</p>
        </div>
      )}

      {data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard label="Nouveaux cas (2022)" value={data.global_overview.total_cases_2022.toLocaleString('fr-FR')} icon="🌍" />
            <KPICard label="Décès (2022)" value={data.global_overview.total_deaths_2022.toLocaleString('fr-FR')} icon="⚠️" />
            <KPICard label="ASR Incidence" value={`${data.global_overview.asr_incidence}/100k`} icon="📊" />
            <KPICard label="ASR Mortalité" value={`${data.global_overview.asr_mortality}/100k`} icon="📉" />
            <KPICard label="Rang mondial" value={`#${data.global_overview.rank_worldwide}`} icon="🏆" />
            <KPICard label="% tous cancers" value={`${data.global_overview.percentage_all_cancers}%`} icon="🔬" />
          </div>

          {/* Summary */}
          <Card>
            <CardHeader><CardTitle className="text-base">📋 Résumé Exécutif</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{data.summary}</p>
            </CardContent>
          </Card>

          <Tabs defaultValue="trends" className="space-y-4">
            <TabsList className="w-full justify-start flex-wrap">
              <TabsTrigger value="trends">📈 Tendances</TabsTrigger>
              <TabsTrigger value="predictions">🔮 Prédictions</TabsTrigger>
              <TabsTrigger value="regions">🗺️ Régions</TabsTrigger>
              <TabsTrigger value="risks">⚠️ Facteurs de risque</TabsTrigger>
              <TabsTrigger value="demographics">👥 Démographie</TabsTrigger>
              <TabsTrigger value="data">📊 Données brutes</TabsTrigger>
            </TabsList>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Incidence Algérie vs Monde (2010-2030)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="year" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                      <Legend />
                      <Area type="monotone" dataKey="algeria_incidence" name="Algérie - Incidence" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                      <Area type="monotone" dataKey="algeria_mortality" name="Algérie - Mortalité" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">ASR Comparée (Algérie vs Monde)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="year" className="text-xs" />
                      <YAxis className="text-xs" label={{ value: 'pour 100 000', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="asr_world" name="ASR Monde" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="asr_algeria" name="ASR Algérie" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Predictions Tab */}
            <TabsContent value="predictions" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Prédictions 2025-2030 avec IC 95%</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={data.predictions}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="confidence_upper" name="IC Sup." stroke="transparent" fill="hsl(var(--primary))" fillOpacity={0.08} />
                      <Area type="monotone" dataKey="confidence_lower" name="IC Inf." stroke="transparent" fill="hsl(var(--background))" fillOpacity={1} />
                      <Line type="monotone" dataKey="asr_algeria" name="ASR Prédite" stroke="hsl(var(--primary))" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Tableau des Prédictions</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Année</TableHead>
                        <TableHead>Incidence Algérie</TableHead>
                        <TableHead>Mortalité Algérie</TableHead>
                        <TableHead>ASR</TableHead>
                        <TableHead>IC 95%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.predictions.map(r => (
                        <TableRow key={r.year}>
                          <TableCell className="font-medium">{r.year}</TableCell>
                          <TableCell>{r.algeria_incidence?.toLocaleString('fr-FR')}</TableCell>
                          <TableCell>{r.algeria_mortality?.toLocaleString('fr-FR')}</TableCell>
                          <TableCell>{r.asr_algeria?.toFixed(1)}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">[{r.confidence_lower?.toFixed(1)} – {r.confidence_upper?.toFixed(1)}]</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Regions Tab */}
            <TabsContent value="regions" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Comparaison Régionale ASR</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={data.regional_comparison} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" label={{ value: 'ASR pour 100 000', position: 'bottom' }} />
                      <YAxis type="category" dataKey="region" width={120} className="text-xs" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="asr_incidence" name="Incidence" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="asr_mortality" name="Mortalité" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Détails par Région</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Région</TableHead>
                        <TableHead>ASR Incidence</TableHead>
                        <TableHead>ASR Mortalité</TableHead>
                        <TableHead>Tendance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.regional_comparison.map(r => (
                        <TableRow key={r.region}>
                          <TableCell className="font-medium">{r.region}</TableCell>
                          <TableCell>{r.asr_incidence}</TableCell>
                          <TableCell>{r.asr_mortality}</TableCell>
                          <TableCell>
                            <Badge variant={r.trend === 'hausse' ? 'destructive' : r.trend === 'baisse' ? 'default' : 'secondary'}>
                              {r.trend === 'hausse' ? '↑' : r.trend === 'baisse' ? '↓' : '→'} {r.trend}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Risk Factors Tab */}
            <TabsContent value="risks" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {data.risk_factors.map((rf, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className={rf.impact === 'élevé' ? 'text-destructive' : rf.impact === 'modéré' ? 'text-amber-500' : 'text-muted-foreground'} />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{rf.factor}</span>
                            <Badge variant={rf.impact === 'élevé' ? 'destructive' : 'secondary'} className="text-[10px]">{rf.impact}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{rf.description}</p>
                          <p className="text-xs"><span className="font-medium">Prévalence Algérie :</span> {rf.prevalence_algeria}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Demographics Tab */}
            <TabsContent value="demographics" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Distribution par Âge</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.age_distribution}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="age_group" className="text-xs" />
                        <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Bar dataKey="percentage" name="%" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Ratio Homme/Femme</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={[
                          { name: 'Hommes', value: data.sex_ratio.male_percentage },
                          { name: 'Femmes', value: data.sex_ratio.female_percentage },
                        ]} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                          <Cell fill="hsl(var(--primary))" />
                          <Cell fill="#ec4899" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Raw Data Tab */}
            <TabsContent value="data" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Données Historiques Complètes</CardTitle>
                  <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1">
                    <Download size={14} /> Export PDF
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Année</TableHead>
                          <TableHead>Monde Inc.</TableHead>
                          <TableHead>Afrique Inc.</TableHead>
                          <TableHead>Afr. Nord Inc.</TableHead>
                          <TableHead>Algérie Inc.</TableHead>
                          <TableHead>Algérie Mort.</TableHead>
                          <TableHead>ASR Monde</TableHead>
                          <TableHead>ASR Algérie</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.historical_data.map(r => (
                          <TableRow key={r.year}>
                            <TableCell className="font-medium">{r.year}</TableCell>
                            <TableCell>{r.world_incidence?.toLocaleString('fr-FR')}</TableCell>
                            <TableCell>{r.africa_incidence?.toLocaleString('fr-FR')}</TableCell>
                            <TableCell>{r.north_africa_incidence?.toLocaleString('fr-FR')}</TableCell>
                            <TableCell>{r.algeria_incidence?.toLocaleString('fr-FR')}</TableCell>
                            <TableCell>{r.algeria_mortality?.toLocaleString('fr-FR')}</TableCell>
                            <TableCell>{r.asr_world?.toFixed(1)}</TableCell>
                            <TableCell>{r.asr_algeria?.toFixed(1)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Methodology & Sources */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen size={16} /> Méthodologie</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{data.methodology}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">📚 Sources & Références</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {data.sources.map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                          <span className="text-primary font-bold">{i + 1}.</span> {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              <Card>
                <CardHeader><CardTitle className="text-base">🎯 Recommandations</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    {data.recommendations.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{i + 1}</span>
                        <p className="text-sm">{r}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function KPICard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4 text-center">
        <span className="text-xl">{icon}</span>
        <p className="text-lg font-bold mt-1">{value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      </CardContent>
    </Card>
  );
}
