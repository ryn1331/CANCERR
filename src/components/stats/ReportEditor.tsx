import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Brain, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  type CaseWithPatient, type PopulationRow, type LocationRank,
  topLocations, groupByAgeAndSex, casesToAgeMap, populationToAgeMap,
  calculateASR, crudeRate, sexRatio, SEGI_WEIGHTS, SEGI_TOTAL,
  asrWithCI, microscopicVerification, stagingCompleteness, medianAge, meanAge,
  annualPercentChange, cumulativeRate074,
} from '@/lib/epidemiology';

const TEMPLATES = [
  { id: 'annual', label: 'Rapport Annuel' },
  { id: 'location', label: 'Rapport par Localisation' },
  { id: 'iarc', label: 'Fiche IARC CI5' },
] as const;

const SECTIONS = [
  { id: 'summary', label: '🤖 Résumé IA', desc: 'Synthèse interprétative générée par IA' },
  { id: 'asr', label: '📊 Indicateurs ASR', desc: 'Taux brut, ASR, IC 95%, risque cumulé' },
  { id: 'top10', label: '🏆 Top 10 Localisations', desc: 'Classement avec ratio H/F' },
  { id: 'pyramid', label: '📐 Pyramide des âges', desc: 'Répartition par tranche et sexe' },
  { id: 'evolution', label: '📈 Évolution temporelle', desc: 'Tendance annuelle avec APC' },
  { id: 'treatments', label: '💊 Traitements', desc: 'Répartition et efficacité' },
  { id: 'quality', label: '✅ Qualité des données', desc: 'MV%, staging, site inconnu' },
] as const;

interface Props {
  cases: CaseWithPatient[];
  population: PopulationRow[];
  traitements: any[];
}

export default function ReportEditor({ cases, population, traitements }: Props) {
  const [template, setTemplate] = useState<string>('annual');
  const [selectedSections, setSelectedSections] = useState<string[]>(['asr', 'top10', 'pyramid', 'evolution', 'treatments']);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

  const toggleSection = (id: string) => {
    setSelectedSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  // Computed stats
  const top10 = useMemo(() => topLocations(cases, 10), [cases]);
  const ageData = useMemo(() => groupByAgeAndSex(cases), [cases]);
  const totalPop = population.reduce((s, r) => s + r.population, 0);
  const casesByAge = useMemo(() => casesToAgeMap(cases), [cases]);
  const popByAge = useMemo(() => populationToAgeMap(population), [population]);
  const crude = crudeRate(cases.length, totalPop);
  const asrCI = useMemo(() => asrWithCI(casesByAge, popByAge, SEGI_WEIGHTS, SEGI_TOTAL), [casesByAge, popByAge]);
  const cumRate = useMemo(() => cumulativeRate074(casesByAge, popByAge), [casesByAge, popByAge]);
  const maleCount = cases.filter(c => c.patients?.sexe === 'M').length;
  const femaleCount = cases.filter(c => c.patients?.sexe === 'F').length;
  const mvPercent = useMemo(() => microscopicVerification(cases), [cases]);
  const stagePercent = useMemo(() => stagingCompleteness(cases), [cases]);
  const medAge = useMemo(() => medianAge(cases), [cases]);

  // Evolution data
  const evolutionData = useMemo(() => {
    const byYear: Record<number, number> = {};
    cases.forEach(c => {
      const y = new Date(c.date_diagnostic).getFullYear();
      byYear[y] = (byYear[y] || 0) + 1;
    });
    return Object.entries(byYear).sort(([a], [b]) => +a - +b).map(([year, count]) => ({
      year: +year, count, rate: totalPop > 0 ? +((count / totalPop) * 100000).toFixed(1) : 0,
    }));
  }, [cases, totalPop]);

  const apc = useMemo(() => annualPercentChange(evolutionData.map(d => ({ year: d.year, rate: d.rate }))), [evolutionData]);

  // Treatment stats
  const treatmentStats = useMemo(() => {
    const byType: Record<string, { count: number; efficace: number }> = {};
    traitements.forEach(t => {
      const type = t.type_traitement || 'Autre';
      if (!byType[type]) byType[type] = { count: 0, efficace: 0 };
      byType[type].count++;
      if (t.efficacite === 'bonne' || t.efficacite === 'partielle') byType[type].efficace++;
    });
    return Object.entries(byType).map(([type, v]) => ({
      type, count: v.count, efficace: v.efficace, taux: v.count > 0 ? Math.round((v.efficace / v.count) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }, [traitements]);

  const generateAiSummary = async () => {
    setAiLoading(true);
    try {
      const stats = {
        totalCas: cases.length, tauxBrut: crude.toFixed(1), asr: asrCI.asr.toFixed(1),
        ratioMF: sexRatio(maleCount, femaleCount).toFixed(2),
        top5: top10.slice(0, 5).map(l => `${l.location}: ${l.count}`).join(', '),
        mvPercent: mvPercent.toFixed(1), medianAge: medAge.toFixed(0),
        apc: `${apc.apc}% (${apc.significant ? 'significatif' : 'non significatif'})`,
      };
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: { stats, wilaya: 'Tlemcen', period: 'Toutes périodes' },
      });
      if (error) throw error;
      setAiSummary(data.report);
      if (!selectedSections.includes('summary')) setSelectedSections(prev => [...prev, 'summary']);
    } catch (err: any) {
      toast.error(err.message || 'Erreur IA');
    } finally { setAiLoading(false); }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('fr-DZ');
    const templateLabel = TEMPLATES.find(t => t.id === template)?.label || 'Rapport';

    doc.setFontSize(16);
    doc.text(`${templateLabel} — Registre du Cancer`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Wilaya de Tlemcen — ${now} — ${cases.length} cas`, 14, 28);
    doc.text('Conforme IARC/OMS · Loi 25-11 ANPDP', 14, 33);
    let y = 42;

    if (selectedSections.includes('asr')) {
      doc.setFontSize(12); doc.text('Indicateurs Épidémiologiques', 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Indicateur', 'Valeur']],
        body: [
          ['Total Cas', cases.length.toString()],
          ['Population', totalPop.toLocaleString()],
          ['Taux Brut (/100k)', crude.toFixed(1)],
          ['ASR Monde (/100k)', asrCI.asr.toFixed(1)],
          ['IC 95%', `[${asrCI.lower.toFixed(1)} – ${asrCI.upper.toFixed(1)}]`],
          ['Risque Cumulé 0-74', `${cumRate.toFixed(2)}%`],
          ['Ratio M/F', sexRatio(maleCount, femaleCount).toFixed(2)],
          ['Âge Médian', `${medAge.toFixed(0)} ans`],
        ],
        theme: 'striped', headStyles: { fillColor: [41, 98, 168] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (selectedSections.includes('top10')) {
      doc.setFontSize(12); doc.text('Top 10 Localisations Tumorales', 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [['#', 'Localisation', 'Cas', 'H', 'F', 'Ratio M/F', '%']],
        body: top10.map((l, i) => [
          (i + 1).toString(), l.location, l.count.toString(),
          l.male.toString(), l.female.toString(),
          l.ratio === Infinity ? '∞' : l.ratio.toFixed(2), l.percentage + '%',
        ]),
        theme: 'striped', headStyles: { fillColor: [41, 98, 168] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (selectedSections.includes('pyramid')) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFontSize(12); doc.text('Répartition par Tranche d\'Âge et Sexe', 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Tranche', 'Hommes', 'Femmes', 'Total']],
        body: ageData.filter(d => d.total > 0).map(d => [d.ageGroup, d.male.toString(), d.female.toString(), d.total.toString()]),
        theme: 'striped', headStyles: { fillColor: [41, 98, 168] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (selectedSections.includes('evolution')) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFontSize(12); doc.text('Évolution Temporelle', 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Année', 'Cas', 'Taux (/100k)']],
        body: evolutionData.map(d => [d.year.toString(), d.count.toString(), d.rate.toString()]),
        theme: 'striped', headStyles: { fillColor: [41, 98, 168] },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
      doc.setFontSize(9);
      doc.text(`APC = ${apc.apc}% ${apc.significant ? '(p<0.05, significatif)' : '(non significatif)'}`, 14, y);
      y += 10;
    }

    if (selectedSections.includes('treatments') && treatmentStats.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFontSize(12); doc.text('Statistiques Traitements', 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Type', 'Nb', 'Efficace', 'Taux %']],
        body: treatmentStats.map(t => [t.type, t.count.toString(), t.efficace.toString(), t.taux + '%']),
        theme: 'striped', headStyles: { fillColor: [41, 98, 168] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (selectedSections.includes('quality')) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFontSize(12); doc.text('Indicateurs Qualité (IARC)', 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Indicateur', 'Valeur', 'Seuil IARC']],
        body: [
          ['% Vérification Microscopique (MV%)', mvPercent.toFixed(1) + '%', '> 80%'],
          ['% Staging TNM', stagePercent.toFixed(1) + '%', '> 70%'],
        ],
        theme: 'striped', headStyles: { fillColor: [41, 98, 168] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (selectedSections.includes('summary') && aiSummary) {
      if (y > 200) { doc.addPage(); y = 20; }
      doc.setFontSize(12); doc.text('Résumé Interprétatif (IA)', 14, y); y += 6;
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(aiSummary, 180);
      doc.text(lines, 14, y);
    }

    doc.save(`${templateLabel.replace(/ /g, '_')}_${now}.pdf`);
    toast.success('PDF exporté');
  };

  const exportCSV = () => {
    let csv = 'Localisation,Cas,Hommes,Femmes,Ratio,Pourcentage\n';
    top10.forEach(l => { csv += `${l.location},${l.count},${l.male},${l.female},${l.ratio},${l.percentage}%\n`; });
    csv += '\nTrancheAge,Hommes,Femmes,Total\n';
    ageData.forEach(d => { csv += `${d.ageGroup},${d.male},${d.female},${d.total}\n`; });
    csv += '\nAnnee,Cas,Taux\n';
    evolutionData.forEach(d => { csv += `${d.year},${d.count},${d.rate}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rapport_cancer_tlemcen_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('CSV exporté');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Config panel */}
      <div className="stat-card space-y-5">
        <h3 className="font-display font-semibold">⚙️ Configuration</h3>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Template</label>
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TEMPLATES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Sections à inclure</label>
          <div className="space-y-1">
            {SECTIONS.map(s => (
              <label key={s.id} className="flex items-start gap-2.5 text-sm cursor-pointer hover:bg-muted/50 rounded-md px-2 py-2 transition-colors">
                <Checkbox
                  checked={selectedSections.includes(s.id)}
                  onCheckedChange={() => toggleSection(s.id)}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-medium">{s.label}</span>
                  <p className="text-[10px] text-muted-foreground leading-tight">{s.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <Button onClick={generateAiSummary} disabled={aiLoading} variant="outline" className="w-full">
            {aiLoading ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Brain size={14} className="mr-1.5" />}
            Générer Résumé IA
          </Button>
          <Button onClick={exportPDF} className="w-full">
            <FileText size={14} className="mr-1.5" /> Exporter PDF
          </Button>
          <Button onClick={exportCSV} variant="secondary" className="w-full">
            <Download size={14} className="mr-1.5" /> Exporter CSV
          </Button>
        </div>
      </div>

      {/* Preview panel */}
      <div className="stat-card lg:col-span-2 space-y-4 max-h-[80vh] overflow-y-auto">
        <h3 className="font-display font-semibold flex items-center gap-2 sticky top-0 bg-card z-10 pb-2">
          <Sparkles size={16} className="text-primary" />
          Prévisualisation — {TEMPLATES.find(t => t.id === template)?.label}
        </h3>

        <div className="text-xs text-muted-foreground border-b border-border pb-2">
          Wilaya de Tlemcen · {cases.length} cas · Population : {totalPop.toLocaleString()} · Standards IARC/OMS
        </div>

        {/* ASR Section */}
        {selectedSections.includes('asr') && (
          <section className="border border-border rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-sm">📊 Indicateurs Épidémiologiques</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              {[
                { l: 'Taux Brut', v: crude.toFixed(1), u: '/100k' },
                { l: 'ASR Monde', v: asrCI.asr.toFixed(1), u: '/100k' },
                { l: 'IC 95%', v: `${asrCI.lower.toFixed(1)}–${asrCI.upper.toFixed(1)}`, u: '' },
                { l: 'Risque Cumulé 0-74', v: cumRate.toFixed(2), u: '%' },
                { l: 'Ratio M/F', v: sexRatio(maleCount, femaleCount).toFixed(2), u: '' },
                { l: 'Âge Médian', v: medAge.toFixed(0), u: 'ans' },
                { l: 'Total Cas', v: cases.length.toString(), u: '' },
                { l: 'MV%', v: mvPercent.toFixed(1), u: '%' },
              ].map(k => (
                <div key={k.l} className="bg-muted/50 rounded-md p-2">
                  <p className="text-lg font-bold">{k.v}<span className="text-xs font-normal text-muted-foreground ml-0.5">{k.u}</span></p>
                  <p className="text-[10px] text-muted-foreground">{k.l}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top 10 Section */}
        {selectedSections.includes('top10') && (
          <section className="border border-border rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-sm">🏆 Top 10 Localisations Tumorales</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead className="text-center">Cas</TableHead>
                  <TableHead className="text-center">H</TableHead>
                  <TableHead className="text-center">F</TableHead>
                  <TableHead className="text-center">M/F</TableHead>
                  <TableHead className="text-center">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top10.map((l, i) => (
                  <TableRow key={l.location}>
                    <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{l.location}</TableCell>
                    <TableCell className="text-center font-semibold">{l.count}</TableCell>
                    <TableCell className="text-center text-blue-600">{l.male}</TableCell>
                    <TableCell className="text-center text-pink-600">{l.female}</TableCell>
                    <TableCell className="text-center">{l.ratio === Infinity ? '∞' : l.ratio.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{l.percentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* Mini bar chart */}
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={top10.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-[10px]" />
                <YAxis type="category" dataKey="location" width={90} className="text-[10px]" />
                <Tooltip />
                <Bar dataKey="male" name="Hommes" fill="hsl(var(--primary))" stackId="a" />
                <Bar dataKey="female" name="Femmes" fill="#ec4899" stackId="a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* Pyramid Section */}
        {selectedSections.includes('pyramid') && (
          <section className="border border-border rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-sm">📐 Pyramide des Âges</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ageData.filter(d => d.total > 0)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-[10px]" />
                <YAxis type="category" dataKey="ageGroup" width={50} className="text-[10px]" />
                <Tooltip />
                <Legend />
                <Bar dataKey="male" name="Hommes" fill="hsl(var(--primary))" />
                <Bar dataKey="female" name="Femmes" fill="#ec4899" />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* Evolution Section */}
        {selectedSections.includes('evolution') && (
          <section className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">📈 Évolution Temporelle</h4>
              <Badge variant={apc.significant ? 'destructive' : 'secondary'} className="text-[10px]">
                APC = {apc.apc}% {apc.significant ? '(p<0.05)' : '(NS)'}
              </Badge>
            </div>
            {evolutionData.length > 1 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="year" className="text-[10px]" />
                  <YAxis className="text-[10px]" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" name="Cas" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="rate" name="Taux /100k" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="5 5" dot />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Données insuffisantes pour l'évolution temporelle</p>
            )}
          </section>
        )}

        {/* Treatments Section */}
        {selectedSections.includes('treatments') && (
          <section className="border border-border rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-sm">💊 Statistiques Traitements</h4>
            {treatmentStats.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Nombre</TableHead>
                      <TableHead className="text-center">Efficace</TableHead>
                      <TableHead className="text-center">Taux</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {treatmentStats.map(t => (
                      <TableRow key={t.type}>
                        <TableCell className="font-medium">{t.type}</TableCell>
                        <TableCell className="text-center">{t.count}</TableCell>
                        <TableCell className="text-center">{t.efficace}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={t.taux >= 60 ? 'default' : t.taux >= 30 ? 'secondary' : 'destructive'}>{t.taux}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={treatmentStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="type" className="text-[10px]" />
                    <YAxis className="text-[10px]" />
                    <Tooltip />
                    <Bar dataKey="count" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="efficace" name="Efficace" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée de traitement disponible</p>
            )}
          </section>
        )}

        {/* Quality Section */}
        {selectedSections.includes('quality') && (
          <section className="border border-border rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-sm">✅ Indicateurs Qualité IARC</h4>
            <div className="grid grid-cols-2 gap-4">
              <QualityGauge label="Vérification Microscopique (MV%)" value={mvPercent} threshold={80} />
              <QualityGauge label="Complétude Staging TNM" value={stagePercent} threshold={70} />
            </div>
          </section>
        )}

        {/* AI Summary Section */}
        {selectedSections.includes('summary') && (
          <section className="border border-border rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-sm">🤖 Résumé Interprétatif (IA)</h4>
            {aiSummary ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{aiSummary}</p>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-2">Cliquez sur "Générer Résumé IA" pour créer le résumé</p>
                <Button onClick={generateAiSummary} disabled={aiLoading} variant="outline" size="sm">
                  {aiLoading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Brain size={14} className="mr-1" />}
                  Générer
                </Button>
              </div>
            )}
          </section>
        )}

        {selectedSections.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">Sélectionnez des sections à inclure dans le rapport</p>
        )}
      </div>
    </div>
  );
}

function QualityGauge({ label, value, threshold }: { label: string; value: number; threshold: number }) {
  const isGood = value >= threshold;
  return (
    <div className="text-center space-y-1">
      <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${isGood ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(value, 100)}%` }} />
        <div className="absolute top-0 h-full w-px bg-foreground/30" style={{ left: `${threshold}%` }} />
      </div>
      <p className="text-xs font-semibold">{value.toFixed(1)}% <span className="font-normal text-muted-foreground">(seuil: {threshold}%)</span></p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
