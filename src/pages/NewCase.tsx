import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2, AlertTriangle, User, Stethoscope, FlaskConical, HeartPulse,
  FileText, MapPin, Microscope, Activity, Shield, Search, CheckCircle2, XCircle, FolderOpen,
  ChevronLeft, ChevronRight, Save, ArrowRight, Scan, Film, Radio, Image,
  FileSpreadsheet, FileCheck, Camera, ShieldCheck, ClipboardList,
} from 'lucide-react';
import GlobalVoiceButton from '@/components/GlobalVoiceButton';
import PatientFileUpload from '@/components/PatientFileUpload';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { validateCase, ICDO3_TOPOGRAPHY, ICDO3_MORPHOLOGY } from '@/lib/iacr-validation';

// Fallback constants (used if DB descriptors fail to load)
const CANCER_TYPES_FALLBACK = [
  'Poumon', 'Colorectal', 'Sein', 'Prostate', 'Vessie', 'Estomac',
  'Foie', 'Pancréas', 'Rein', 'Thyroïde', 'Leucémie', 'Lymphome',
  'Mélanome', 'Col utérin', 'Ovaire', 'Cavité buccale', 'Larynx',
  'Œsophage', 'Cerveau/SNC', 'Sarcome', 'Myélome', 'Autre',
];

import { WILAYAS_ALGERIE, COMMUNES_TLEMCEN } from '@/lib/wilayas';

const METHODES_FALLBACK = [
  { value: 'histologie', label: 'Histologie' },
  { value: 'cytologie', label: 'Cytologie' },
  { value: 'clinique', label: 'Clinique seule' },
  { value: 'imagerie', label: 'Imagerie' },
  { value: 'biochimie', label: 'Marqueurs biochimiques' },
  { value: 'dco', label: 'Certificat de décès (DCO)' },
];

const GRADES_FALLBACK = ['G1 — Bien différencié', 'G2 — Moyennement différencié', 'G3 — Peu différencié', 'G4 — Indifférencié', 'GX — Non évalué'];

const COMORBIDITES_OPTIONS = ['Diabète', 'HTA', 'Cardiopathie', 'BPCO', 'Hépatite', 'VIH', 'Insuffisance rénale', 'Autre'];
const LATERALITES = ['Non applicable', 'Droite', 'Gauche', 'Bilatéral'];

interface CancerRef { id: string; nom: string; code: string | null; type_categorie: string; }
interface ComorbiditeRef { id: string; libelle: string; }
interface AntecedentRef { id: string; libelle: string; }

const DOC_TYPES_PREVIEW = [
  { value: 'irm', label: 'IRM', icon: Scan, color: 'text-purple-500 bg-purple-500/10' },
  { value: 'scanner', label: 'Scanner / TDM', icon: Film, color: 'text-indigo-500 bg-indigo-500/10' },
  { value: 'pet_scan', label: 'PET Scan', icon: HeartPulse, color: 'text-pink-500 bg-pink-500/10' },
  { value: 'radio', label: 'Radiographie', icon: Radio, color: 'text-sky-500 bg-sky-500/10' },
  { value: 'echographie', label: 'Échographie', icon: Scan, color: 'text-cyan-500 bg-cyan-500/10' },
  { value: 'mammographie', label: 'Mammographie', icon: Image, color: 'text-rose-400 bg-rose-400/10' },
  { value: 'scintigraphie', label: 'Scintigraphie', icon: HeartPulse, color: 'text-amber-500 bg-amber-500/10' },
  { value: 'biopsie', label: 'Biopsie', icon: Microscope, color: 'text-blue-500 bg-blue-500/10' },
  { value: 'anapath', label: 'Anapath', icon: FileCheck, color: 'text-emerald-500 bg-emerald-500/10' },
  { value: 'biologie', label: 'Bilan Sanguin', icon: FileSpreadsheet, color: 'text-orange-500 bg-orange-500/10' },
  { value: 'compte_rendu', label: 'Compte-rendu', icon: ClipboardList, color: 'text-teal-500 bg-teal-500/10' },
  { value: 'consentement', label: 'Consentement', icon: ShieldCheck, color: 'text-rose-500 bg-rose-500/10' },
  { value: 'ordonnance', label: 'Ordonnance', icon: FileText, color: 'text-violet-500 bg-violet-500/10' },
  { value: 'photo', label: 'Photo clinique', icon: Camera, color: 'text-lime-600 bg-lime-600/10' },
  { value: 'autre', label: 'Autre', icon: FileText, color: 'text-muted-foreground bg-muted' },
];

const STEPS = [
  { id: 'identite', label: 'Identité', shortLabel: 'ID', icon: User },
  { id: 'epidemio', label: 'Épidémiologie', shortLabel: 'Épid', icon: MapPin },
  { id: 'diagnostic', label: 'Diagnostic', shortLabel: 'Diag', icon: Stethoscope },
  { id: 'topographie', label: 'Topographie', shortLabel: 'Topo', icon: Search },
  { id: 'morphologie', label: 'Morphologie', shortLabel: 'Morpho', icon: Microscope },
  { id: 'stade', label: 'Stade', shortLabel: 'TNM', icon: Shield },
  { id: 'traitement', label: 'Traitement', shortLabel: 'Trait', icon: FlaskConical },
  { id: 'suivi', label: 'Suivi', shortLabel: 'Suivi', icon: Activity },
  { id: 'documents', label: 'Documents', shortLabel: 'Docs', icon: FolderOpen },
];

export default function NewCase() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [duplicatePatients, setDuplicatePatients] = useState<{ id: string; nom: string; prenom: string; date_naissance: string | null; num_dossier: string | null }[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [topoSearch, setTopoSearch] = useState('');
  const [morphoSearch, setMorphoSearch] = useState('');
  const [savedPatientId, setSavedPatientId] = useState<string | null>(null);
  const [savedCaseId, setSavedCaseId] = useState<string | null>(null);

  // Dynamic descriptors from DB
  const [cancerTypes, setCancerTypes] = useState<string[]>(CANCER_TYPES_FALLBACK);
  const [methodesDiagnostic, setMethodesDiagnostic] = useState(METHODES_FALLBACK);
  const [grades, setGrades] = useState(GRADES_FALLBACK);

  // Reference tables data
  const [cancersRef, setCancersRef] = useState<CancerRef[]>([]);
  const [comorbRef, setComorbRef] = useState<ComorbiditeRef[]>([]);
  const [hemoSearch, setHemoSearch] = useState('');

  const db = supabase as any;

  useEffect(() => {
    // Load cancer descriptors
    supabase.from('cancer_descriptors').select('category, code, label, sort_order').eq('is_active', true).order('sort_order')
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const types = data.filter(d => d.category === 'type_cancer').map(d => d.label);
        const meths = data.filter(d => d.category === 'methode_diagnostic').map(d => ({ value: d.code, label: d.label }));
        const gds = data.filter(d => d.category === 'grade').map(d => d.label);
        if (types.length) setCancerTypes(types);
        if (meths.length) setMethodesDiagnostic(meths);
        if (gds.length) setGrades(gds);
      });

    // Load cancers_ref (includes hemopathies)
    db.from('cancers_ref').select('id, nom, code, type_categorie').eq('actif', true).order('sort_order')
      .then(({ data }: any) => { if (data) setCancersRef(data); });

    // Load comorbidites_ref
    db.from('comorbidites_ref').select('id, libelle').eq('actif', true).order('sort_order')
      .then(({ data }: any) => { if (data) setComorbRef(data); });
  }, []);

  const [form, setForm] = useState({
    nom: '', prenom: '', dateNaissance: '', sexe: '', telephone: '', numDossier: '',
    wilaya: 'Tlemcen', commune: '', milieu: 'urbain', profession: '',
    methodeDiagnostic: 'histologie', dateDiagnostic: '', typeCancer: '', sourceInfo: '', baseDiagnostic: '',
    topographieIcdo: '', codeIcdo: '', lateralite: '',
    morphologieIcdo: '', comportement: '', sousTypeCancer: '', grade: '',
    stadeTnm: '', stadeChiffre: '', anomaliesMoleculaires: '',
    medecinAnapath: '', dateAnapath: '', refAnapath: '', resultatAnapath: '',
    biologieFns: '', biologieGlobules: '', biologieDate: '',
    tabagisme: 'non', tabagismeAnnees: '', alcool: 'non', sportif: 'non',
    poidsKg: '', tailleCm: '', alimentation: '', activitePhysique: 'sedentaire',
    expositionsProfessionnelles: '', antecedentsFamiliaux: 'non', antecedentsFamiliauxDetails: '',
    comorbidites: [] as string[],
    symptomes: '', notes: '',
    dateDeces: '', causeDeces: '', dateDerniereNouvelle: '', statutVital: 'vivant',
    // Hemopathie fields
    isHemopathie: false,
    diagnosticHemato: '',
    diagnosticHematoCode: '',
    examensComplementaires: '',
  });

  const update = useCallback((key: string, value: string | string[]) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  const handleVoiceFields = useCallback((fields: Record<string, string>) => {
    setForm(f => {
      const updated = { ...f };
      for (const [key, value] of Object.entries(fields)) {
        if (key in updated && value && key !== 'comorbidites') {
          if (['symptomes', 'notes', 'resultatAnapath'].includes(key)) {
            (updated as any)[key] = (updated as any)[key]
              ? (updated as any)[key] + ' ' + value : value;
          } else if (!(updated as any)[key]) {
            (updated as any)[key] = value;
          }
        }
      }
      return updated;
    });
  }, []);

  const validationErrors = useMemo(() => validateCase({
    nom: form.nom, prenom: form.prenom, dateNaissance: form.dateNaissance,
    sexe: form.sexe, dateDiagnostic: form.dateDiagnostic, typeCancer: form.typeCancer,
    topographieIcdo: form.topographieIcdo, morphologieIcdo: form.morphologieIcdo,
    codeIcdo: form.codeIcdo, stadeTnm: form.stadeTnm, resultatAnapath: form.resultatAnapath,
    methodeDiagnostic: form.methodeDiagnostic,
  }), [form]);

  const errorCount = validationErrors.filter(e => e.severity === 'error').length;
  const warningCount = validationErrors.filter(e => e.severity === 'warning').length;

  const checkDuplicate = async () => {
    if (!form.nom || !form.prenom) return;
    // Fuzzy: search by name only (case-insensitive), optionally matching date
    const { data } = await supabase.from('patients').select('id, nom, prenom, date_naissance, num_dossier')
      .ilike('nom', `%${form.nom.trim()}%`).ilike('prenom', `%${form.prenom.trim()}%`).limit(5);
    const matches = data || [];
    setDuplicatePatients(matches);
    setDuplicateWarning(matches.length > 0);
  };

  const useExistingPatient = async (patientId: string) => {
    setSavedPatientId(patientId);
    setDuplicateWarning(false);

    // Auto-update existing patient with any new info from the form
    const updates: Record<string, any> = {};
    if (form.telephone) updates.telephone = form.telephone;
    if (form.commune) updates.commune = form.commune;
    if (form.dateNaissance) updates.date_naissance = form.dateNaissance;
    if (form.numDossier) updates.num_dossier = form.numDossier;
    if (form.wilaya) updates.wilaya = form.wilaya;

    if (Object.keys(updates).length > 0) {
      const { data: existing } = await supabase.from('patients').select('telephone, commune, date_naissance, num_dossier').eq('id', patientId).single();
      if (existing) {
        const toUpdate: Record<string, any> = {};
        for (const [key, value] of Object.entries(updates)) {
          if (!(existing as any)[key]) toUpdate[key] = value;
        }
        if (Object.keys(toUpdate).length > 0) {
          await supabase.from('patients').update(toUpdate).eq('id', patientId);
        }
      }
    }

    toast.success('Patient existant sélectionné — Remplissez le cas cancer');
    setCurrentStep(2);
  };

  const filteredTopo = topoSearch.length >= 1
    ? ICDO3_TOPOGRAPHY.filter(t => t.code.toLowerCase().includes(topoSearch.toLowerCase()) || t.label.toLowerCase().includes(topoSearch.toLowerCase()))
    : ICDO3_TOPOGRAPHY;

  const filteredMorpho = morphoSearch.length >= 1
    ? ICDO3_MORPHOLOGY.filter(m => m.code.includes(morphoSearch) || m.label.toLowerCase().includes(morphoSearch.toLowerCase()))
    : ICDO3_MORPHOLOGY;

  const handleSubmit = async () => {
    if (!user) return;
    const criticalErrors = validationErrors.filter(e => e.severity === 'error');
    if (criticalErrors.length > 0) {
      toast.error(`${criticalErrors.length} erreur(s) de validation à corriger`);
      return;
    }
    // Validate hemopathie examens
    if (form.isHemopathie && !form.examensComplementaires.trim()) {
      toast.error('Examens complémentaires obligatoires pour les hémopathies');
      return;
    }

    setLoading(true);
    try {
      let patientId = savedPatientId; // Use existing patient if selected from duplicates

      if (!patientId) {
        const code = form.numDossier || `P-${Date.now().toString(36).toUpperCase()}`;
        const { data: patient, error: patientErr } = await supabase.from('patients').insert({
          code_patient: code, nom: form.nom, prenom: form.prenom,
          date_naissance: form.dateNaissance || null, sexe: form.sexe,
          commune: form.commune, telephone: form.telephone || null,
          num_dossier: form.numDossier || null, wilaya: form.wilaya || 'Tlemcen', created_by: user.id,
        }).select().single();
        if (patientErr) throw patientErr;
        patientId = patient.id;
      }

      const tabagismeVal = form.tabagisme === 'oui' && form.tabagismeAnnees
        ? `Oui (${form.tabagismeAnnees} ans)` : form.tabagisme;

      const caseRecord: any = {
        patient_id: patientId!, type_cancer: form.typeCancer,
        sous_type_cancer: form.sousTypeCancer || null, code_icdo: form.codeIcdo || null,
        topographie_icdo: form.topographieIcdo || null, morphologie_icdo: form.morphologieIcdo || null,
        comportement: form.comportement || null, grade: form.grade || null,
        lateralite: form.lateralite || null, methode_diagnostic: form.methodeDiagnostic,
        milieu: form.milieu, profession: form.profession || null,
        base_diagnostic: form.baseDiagnostic || null, source_info: form.sourceInfo || null,
        stade_tnm: form.stadeTnm || null, anomalies_moleculaires: form.anomaliesMoleculaires || null,
        date_diagnostic: form.dateDiagnostic, medecin_anapath: form.medecinAnapath || null,
        date_anapath: form.dateAnapath || null, ref_anapath: form.refAnapath || null,
        resultat_anapath: form.resultatAnapath || null, biologie_fns: form.biologieFns || null,
        biologie_globules: form.biologieGlobules || null, biologie_date: form.biologieDate || null,
        tabagisme: tabagismeVal, alcool: form.alcool, sportif: form.sportif,
        poids_kg: form.poidsKg ? parseFloat(form.poidsKg) : null,
        taille_cm: form.tailleCm ? parseFloat(form.tailleCm) : null,
        imc: form.poidsKg && form.tailleCm ? parseFloat((parseFloat(form.poidsKg) / Math.pow(parseFloat(form.tailleCm) / 100, 2)).toFixed(1)) : null,
        alimentation: form.alimentation || null,
        activite_physique: form.activitePhysique || 'sedentaire',
        expositions_professionnelles: form.expositionsProfessionnelles || null,
        antecedents_familiaux: form.antecedentsFamiliaux || 'non',
        antecedents_familiaux_details: form.antecedentsFamiliauxDetails || null,
        comorbidites: form.comorbidites.length > 0 ? form.comorbidites : null,
        symptomes: form.symptomes || null, notes: form.notes || null,
        date_deces: form.dateDeces || null, cause_deces: form.causeDeces || null,
        date_derniere_nouvelle: form.dateDerniereNouvelle || null,
        statut_vital: form.statutVital, statut: 'valide', created_by: user.id,
        // Hemopathie fields
        is_hemopathie: form.isHemopathie,
        diagnostic_hemato: form.diagnosticHemato || null,
        diagnostic_hemato_code: form.diagnosticHematoCode || null,
        examens_complementaires: form.examensComplementaires || null,
      };

      const { data: caseData, error: caseErr } = await supabase.from('cancer_cases').insert(caseRecord as any).select('id').single();
      if (caseErr) throw caseErr;

      setSavedPatientId(patientId!);
      setSavedCaseId(caseData?.id || null);
      toast.success('✅ Cas enregistré — Ajoutez des documents');
      setCurrentStep(8); // Documents step
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const stepId = STEPS[currentStep].id;
  const isLastFormStep = currentStep === 7; // suivi
  const isDocStep = currentStep === 8;

  // FieldGroup moved outside component — see bottom of file

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-24 md:pb-8">
        {/* Header */}
        <div className="mb-4">
          <h1 className="font-display text-lg md:text-xl font-bold">Nouveau Cas</h1>
          <p className="text-muted-foreground text-xs">Registre du Cancer · Standard IARC/OMS</p>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-primary">
              Étape {currentStep + 1}/{STEPS.length} — {STEPS[currentStep].label}
            </span>
            <div className="flex items-center gap-1.5">
              {errorCount > 0 && form.nom && (
                <Badge variant="destructive" className="text-[10px] h-5 gap-0.5">
                  <XCircle size={10} /> {errorCount}
                </Badge>
              )}
              {warningCount > 0 && form.nom && (
                <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px] h-5 gap-0.5">
                  <AlertTriangle size={10} /> {warningCount}
                </Badge>
              )}
              {errorCount === 0 && warningCount === 0 && form.nom && (
                <Badge className="bg-success/10 text-success border-success/20 text-[10px] h-5 gap-0.5">
                  <CheckCircle2 size={10} /> OK
                </Badge>
              )}
            </div>
          </div>
          {/* Step dots */}
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(i)}
                className={cn(
                  'flex-1 h-1.5 rounded-full transition-all duration-300',
                  i < currentStep ? 'bg-primary' :
                  i === currentStep ? 'bg-primary shadow-sm shadow-primary/30' :
                  'bg-border'
                )}
              />
            ))}
          </div>
          {/* Step icons row - scrollable on mobile */}
          <div className="flex gap-0.5 mt-2 overflow-x-auto no-scrollbar">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(i)}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-[3.2rem] shrink-0',
                  i === currentStep ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'
                )}
              >
                <s.icon size={14} />
                <span className="text-[9px] font-medium leading-none">{s.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Duplicate warning */}
        {duplicateWarning && duplicatePatients.length > 0 && (
          <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 mb-4 space-y-2">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle size={16} />
              <span className="text-xs font-medium">Doublon(s) suspect(s) — {duplicatePatients.length} patient(s) similaire(s)</span>
            </div>
            {duplicatePatients.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-background/80 border border-border/30">
                <div className="text-xs">
                  <span className="font-medium">{p.nom} {p.prenom}</span>
                  <span className="text-muted-foreground ml-2">{p.date_naissance ? new Date(p.date_naissance).toLocaleDateString('fr-DZ') : ''} {p.num_dossier ? `· ${p.num_dossier}` : ''}</span>
                </div>
                <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => useExistingPatient(p.id)}>
                  Utiliser ce patient
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Step content */}
        <AnimatePresence initial={false}>
          <motion.div
            key={stepId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
            className="stat-card space-y-4"
          >
            {/* Step 1: Identité */}
            {stepId === 'identite' && (
              <>
                <StepHeader icon={User} title="Identité Patient" />
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup><Label>Nom *</Label><Input value={form.nom} onChange={e => update('nom', e.target.value)} onBlur={checkDuplicate} required placeholder="NOM" /></FieldGroup>
                    <FieldGroup><Label>Prénom *</Label><Input value={form.prenom} onChange={e => update('prenom', e.target.value)} onBlur={checkDuplicate} required placeholder="Prénom" /></FieldGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup><Label>Date de naissance</Label><Input type="date" value={form.dateNaissance} onChange={e => update('dateNaissance', e.target.value)} onBlur={checkDuplicate} /></FieldGroup>
                    <FieldGroup>
                      <Label>Sexe *</Label>
                      <Select value={form.sexe} onValueChange={v => update('sexe', v)}>
                        <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Masculin</SelectItem>
                          <SelectItem value="F">Féminin</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup><Label>N° Dossier</Label><Input value={form.numDossier} onChange={e => update('numDossier', e.target.value)} placeholder="DOS-2026-001" /></FieldGroup>
                    <FieldGroup><Label>Téléphone</Label><Input value={form.telephone} onChange={e => update('telephone', e.target.value)} placeholder="05XX XX XX XX" /></FieldGroup>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Épidémiologie */}
            {stepId === 'epidemio' && (
              <>
                <StepHeader icon={MapPin} title="Épidémiologie" />
                <div className="grid grid-cols-1 gap-3">
                  <FieldGroup>
                    <Label>Wilaya *</Label>
                    <Select value={form.wilaya} onValueChange={v => { update('wilaya', v); update('commune', ''); }}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner la wilaya" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {WILAYAS_ALGERIE.map(w => (
                          <SelectItem key={w.code} value={w.name}>{w.code} — {w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup>
                      <Label>Commune</Label>
                      {form.wilaya === 'Tlemcen' ? (
                        <Select value={form.commune} onValueChange={v => update('commune', v)}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                          <SelectContent className="max-h-60">{COMMUNES_TLEMCEN.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Input value={form.commune} onChange={e => update('commune', e.target.value)} placeholder="Saisir la commune" />
                      )}
                    </FieldGroup>
                    <FieldGroup>
                      <Label>Milieu</Label>
                      <Select value={form.milieu} onValueChange={v => update('milieu', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urbain">Urbain</SelectItem>
                          <SelectItem value="rural">Rural</SelectItem>
                          <SelectItem value="semi-urbain">Semi-urbain</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                  </div>
                  <FieldGroup><Label>Profession</Label><Input value={form.profession} onChange={e => update('profession', e.target.value)} placeholder="Ex: Agriculteur, Enseignant..." /></FieldGroup>
                </div>
              </>
            )}

            {/* Step 3: Diagnostic */}
            {stepId === 'diagnostic' && (
              <>
                <StepHeader icon={Stethoscope} title="Diagnostic" />
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup>
                      <Label>Méthode *</Label>
                      <Select value={form.methodeDiagnostic} onValueChange={v => update('methodeDiagnostic', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{methodesDiagnostic.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </FieldGroup>
                    <FieldGroup><Label>Date diagnostic *</Label><Input type="date" value={form.dateDiagnostic} onChange={e => update('dateDiagnostic', e.target.value)} required /></FieldGroup>
                  </div>
                  <FieldGroup>
                    <Label>Type de cancer *</Label>
                    <Select value={form.typeCancer} onValueChange={v => {
                      update('typeCancer', v);
                      // Check if selected cancer is a hemopathie
                      const selectedRef = cancersRef.find(c => c.nom === v);
                      if (selectedRef && selectedRef.type_categorie === 'liquide') {
                        update('isHemopathie' as any, true as any);
                        update('diagnosticHemato', selectedRef.nom);
                        update('diagnosticHematoCode', selectedRef.code || '');
                      } else {
                        update('isHemopathie' as any, false as any);
                        update('diagnosticHemato', '');
                        update('diagnosticHematoCode', '');
                        update('examensComplementaires', '');
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {cancersRef.length > 0 ? (
                          <>
                            <SelectItem value="__header_solide" disabled className="font-semibold text-xs text-muted-foreground">— Cancers solides —</SelectItem>
                            {cancersRef.filter(c => c.type_categorie === 'solide').map(c => (
                              <SelectItem key={c.id} value={c.nom}>{c.nom} {c.code ? `(${c.code})` : ''}</SelectItem>
                            ))}
                            <SelectItem value="__header_liquide" disabled className="font-semibold text-xs text-muted-foreground">— Hémopathies malignes —</SelectItem>
                            {cancersRef.filter(c => c.type_categorie === 'liquide').map(c => (
                              <SelectItem key={c.id} value={c.nom}>{c.nom} {c.code ? `(${c.code})` : ''}</SelectItem>
                            ))}
                          </>
                        ) : (
                          cancerTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)
                        )}
                      </SelectContent>
                    </Select>
                  </FieldGroup>

                  {/* Hemopathie-specific fields */}
                  {form.isHemopathie && (
                    <>
                      <div className="p-3 rounded-xl bg-accent/10 border border-accent/30 space-y-3">
                        <p className="text-xs font-semibold text-accent flex items-center gap-1.5">
                          <Stethoscope size={13} /> Diagnostic Hématologique
                        </p>
                        <FieldGroup>
                          <Label className="text-[11px]">Diagnostic sélectionné</Label>
                          <Input value={`${form.diagnosticHemato} ${form.diagnosticHematoCode ? `(${form.diagnosticHematoCode})` : ''}`} readOnly className="bg-muted/50 text-xs" />
                        </FieldGroup>
                        <FieldGroup>
                          <Label className="text-[11px]">Examens complémentaires *</Label>
                          <Textarea
                            value={form.examensComplementaires}
                            onChange={e => update('examensComplementaires', e.target.value)}
                            rows={3}
                            placeholder="Myélogramme, immunophénotypage, caryotype, biologie moléculaire, etc."
                            className="text-xs"
                            required
                          />
                          <p className="text-[10px] text-muted-foreground">Obligatoire pour les hémopathies malignes</p>
                        </FieldGroup>
                      </div>
                    </>
                  )}

                  <FieldGroup><Label>Source d'information</Label><Input value={form.sourceInfo} onChange={e => update('sourceInfo', e.target.value)} placeholder="Hôpital, laboratoire..." /></FieldGroup>
                  <FieldGroup><Label>Base du diagnostic</Label><Input value={form.baseDiagnostic} onChange={e => update('baseDiagnostic', e.target.value)} placeholder="Histologie tumeur primitive..." /></FieldGroup>
                </div>
              </>
            )}



            {/* Step 4: Topographie */}
            {stepId === 'topographie' && (
              <>
                <StepHeader icon={Search} title="Topographie ICD-O3" />
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={topoSearch} onChange={e => setTopoSearch(e.target.value)} placeholder="Rechercher (poumon, C34)..." className="pl-9" />
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-border/40 divide-y divide-border/30">
                    {filteredTopo.slice(0, 20).map(t => (
                      <button key={t.code} type="button"
                        className={cn('w-full text-left px-3 py-2.5 text-sm hover:bg-primary/5 transition-colors flex items-center justify-between',
                          form.topographieIcdo === t.code && 'bg-primary/10 font-medium'
                        )}
                        onClick={() => { update('topographieIcdo', t.code); update('codeIcdo', t.code); }}
                      >
                        <span className="text-xs">{t.label}</span>
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0 ml-2">{t.code}</Badge>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup><Label>Code topographie</Label><Input value={form.topographieIcdo} onChange={e => update('topographieIcdo', e.target.value)} placeholder="C34.1" className="font-mono" /></FieldGroup>
                    <FieldGroup>
                      <Label>Latéralité</Label>
                      <Select value={form.lateralite} onValueChange={v => update('lateralite', v)}>
                        <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                        <SelectContent>{LATERALITES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </FieldGroup>
                  </div>
                </div>
              </>
            )}

            {/* Step 5: Morphologie */}
            {stepId === 'morphologie' && (
              <>
                <StepHeader icon={Microscope} title="Morphologie ICD-O3" />
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={morphoSearch} onChange={e => setMorphoSearch(e.target.value)} placeholder="Rechercher (adénocarcinome, 8140)..." className="pl-9" />
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-border/40 divide-y divide-border/30">
                    {filteredMorpho.slice(0, 20).map(m => (
                      <button key={m.code} type="button"
                        className={cn('w-full text-left px-3 py-2.5 text-sm hover:bg-primary/5 transition-colors flex items-center justify-between',
                          form.morphologieIcdo === m.code && 'bg-primary/10 font-medium'
                        )}
                        onClick={() => { update('morphologieIcdo', m.code); update('sousTypeCancer', m.label); }}
                      >
                        <span className="text-xs">{m.label}</span>
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0 ml-2">{m.code}</Badge>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FieldGroup><Label>Code morphologie</Label><Input value={form.morphologieIcdo} onChange={e => update('morphologieIcdo', e.target.value)} placeholder="8140/3" className="font-mono" /></FieldGroup>
                      <FieldGroup>
                        <Label>Grade</Label>
                        <Select value={form.grade} onValueChange={v => update('grade', v)}>
                          <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                          <SelectContent>{grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                        </Select>
                      </FieldGroup>
                    </div>
                    <FieldGroup><Label>Sous-type histologique</Label><Input value={form.sousTypeCancer} onChange={e => update('sousTypeCancer', e.target.value)} placeholder="Adénocarcinome" /></FieldGroup>
                  </div>
                </div>
              </>
            )}

            {/* Step 6: Stade */}
            {stepId === 'stade' && (
              <>
                <StepHeader icon={Shield} title="Stadification TNM" />
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup><Label>Stade TNM</Label><Input value={form.stadeTnm} onChange={e => update('stadeTnm', e.target.value)} placeholder="T2N1M0" className="font-mono" /></FieldGroup>
                    <FieldGroup>
                      <Label>Stade clinique</Label>
                      <Select value={form.stadeChiffre} onValueChange={v => update('stadeChiffre', v)}>
                        <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                        <SelectContent>
                          {['I', 'IA', 'IB', 'II', 'IIA', 'IIB', 'III', 'IIIA', 'IIIB', 'IIIC', 'IV', 'IVA', 'IVB'].map(s =>
                            <SelectItem key={s} value={s}>Stade {s}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                  </div>
                  <FieldGroup><Label>Anomalies moléculaires</Label><Input value={form.anomaliesMoleculaires} onChange={e => update('anomaliesMoleculaires', e.target.value)} placeholder="EGFR, ALK, KRAS, HER2, BRCA..." /></FieldGroup>
                </div>
              </>
            )}

            {/* Step 7: Traitement / Anapath / Biologie */}
            {stepId === 'traitement' && (
              <>
                <StepHeader icon={FlaskConical} title="Anatomopathologie & Biologie" />
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup><Label>Médecin pathologiste</Label><Input value={form.medecinAnapath} onChange={e => update('medecinAnapath', e.target.value)} placeholder="Dr..." /></FieldGroup>
                    <FieldGroup><Label>Date anapath</Label><Input type="date" value={form.dateAnapath} onChange={e => update('dateAnapath', e.target.value)} /></FieldGroup>
                  </div>
                  <FieldGroup><Label>Référence</Label><Input value={form.refAnapath} onChange={e => update('refAnapath', e.target.value)} placeholder="AP-2026-XXX" /></FieldGroup>
                  <FieldGroup><Label>Résultat histologique</Label><Textarea value={form.resultatAnapath} onChange={e => update('resultatAnapath', e.target.value)} rows={3} placeholder="Description macro et microscopique..." /></FieldGroup>

                  <div className="border-t border-border/30 pt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Biologie</p>
                    <div className="grid grid-cols-3 gap-2">
                      <FieldGroup><Label className="text-[11px]">FNS</Label><Input value={form.biologieFns} onChange={e => update('biologieFns', e.target.value)} className="h-9 text-xs" /></FieldGroup>
                      <FieldGroup><Label className="text-[11px]">Globules</Label><Input value={form.biologieGlobules} onChange={e => update('biologieGlobules', e.target.value)} className="h-9 text-xs" /></FieldGroup>
                      <FieldGroup><Label className="text-[11px]">Date</Label><Input type="date" value={form.biologieDate} onChange={e => update('biologieDate', e.target.value)} className="h-9 text-xs" /></FieldGroup>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 8: Suivi */}
            {stepId === 'suivi' && (
              <>
                <StepHeader icon={Activity} title="Suivi & Mode de Vie" />
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup>
                      <Label>Statut vital</Label>
                      <Select value={form.statutVital} onValueChange={v => update('statutVital', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vivant">Vivant</SelectItem>
                          <SelectItem value="decede">Décédé</SelectItem>
                          <SelectItem value="perdu_de_vue">Perdu de vue</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                    <FieldGroup><Label>Dernière nouvelle</Label><Input type="date" value={form.dateDerniereNouvelle} onChange={e => update('dateDerniereNouvelle', e.target.value)} /></FieldGroup>
                  </div>
                  {form.statutVital === 'decede' && (
                    <div className="grid grid-cols-2 gap-3">
                      <FieldGroup><Label>Date décès</Label><Input type="date" value={form.dateDeces} onChange={e => update('dateDeces', e.target.value)} /></FieldGroup>
                      <FieldGroup><Label>Cause</Label><Input value={form.causeDeces} onChange={e => update('causeDeces', e.target.value)} /></FieldGroup>
                    </div>
                  )}

                  <div className="border-t border-border/30 pt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Mode de vie</p>
                    <div className="grid grid-cols-3 gap-2">
                      <FieldGroup>
                        <Label className="text-[11px]">Tabac</Label>
                        <Select value={form.tabagisme} onValueChange={v => update('tabagisme', v)}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="non">Non</SelectItem>
                            <SelectItem value="oui">Oui</SelectItem>
                            <SelectItem value="ancien">Ancien</SelectItem>
                          </SelectContent>
                        </Select>
                      </FieldGroup>
                      <FieldGroup>
                        <Label className="text-[11px]">Alcool</Label>
                        <Select value={form.alcool} onValueChange={v => update('alcool', v)}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="non">Non</SelectItem>
                            <SelectItem value="oui">Oui</SelectItem>
                            <SelectItem value="ancien">Ancien</SelectItem>
                          </SelectContent>
                        </Select>
                      </FieldGroup>
                      {(form.tabagisme === 'oui' || form.tabagisme === 'ancien') && (
                        <FieldGroup><Label className="text-[11px]">Années</Label><Input value={form.tabagismeAnnees} onChange={e => update('tabagismeAnnees', e.target.value)} placeholder="20" className="h-9 text-xs" /></FieldGroup>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border/30 pt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Anthropométrie & Activité</p>
                    <div className="grid grid-cols-3 gap-2">
                      <FieldGroup><Label className="text-[11px]">Poids (kg)</Label><Input type="number" value={form.poidsKg} onChange={e => update('poidsKg', e.target.value)} placeholder="70" className="h-9 text-xs" /></FieldGroup>
                      <FieldGroup><Label className="text-[11px]">Taille (cm)</Label><Input type="number" value={form.tailleCm} onChange={e => update('tailleCm', e.target.value)} placeholder="170" className="h-9 text-xs" /></FieldGroup>
                      <FieldGroup>
                        <Label className="text-[11px]">IMC</Label>
                        <Input
                          value={form.poidsKg && form.tailleCm ? (parseFloat(form.poidsKg) / Math.pow(parseFloat(form.tailleCm) / 100, 2)).toFixed(1) : ''}
                          readOnly className="h-9 text-xs bg-muted/50" placeholder="Auto"
                        />
                      </FieldGroup>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <FieldGroup>
                        <Label className="text-[11px]">Activité physique</Label>
                        <Select value={form.activitePhysique} onValueChange={v => update('activitePhysique', v)}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sedentaire">Sédentaire</SelectItem>
                            <SelectItem value="moderee">Modérée</SelectItem>
                            <SelectItem value="intense">Intense</SelectItem>
                          </SelectContent>
                        </Select>
                      </FieldGroup>
                      <FieldGroup>
                        <Label className="text-[11px]">Alimentation</Label>
                        <Select value={form.alimentation} onValueChange={v => update('alimentation', v)}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Choisir" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equilibree">Équilibrée</SelectItem>
                            <SelectItem value="riche_graisses">Riche en graisses</SelectItem>
                            <SelectItem value="vegetarienne">Végétarienne</SelectItem>
                            <SelectItem value="autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </FieldGroup>
                    </div>
                  </div>

                  <div className="border-t border-border/30 pt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Expositions & Antécédents</p>
                    <FieldGroup><Label className="text-[11px]">Expositions professionnelles</Label><Textarea value={form.expositionsProfessionnelles} onChange={e => update('expositionsProfessionnelles', e.target.value)} rows={2} placeholder="Amiante, pesticides, radiations..." className="text-xs" /></FieldGroup>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <FieldGroup>
                        <Label className="text-[11px]">Antécédents familiaux cancer</Label>
                        <Select value={form.antecedentsFamiliaux} onValueChange={v => update('antecedentsFamiliaux', v)}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="non">Non</SelectItem>
                            <SelectItem value="oui">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                      </FieldGroup>
                      {form.antecedentsFamiliaux === 'oui' && (
                        <FieldGroup><Label className="text-[11px]">Détails</Label><Input value={form.antecedentsFamiliauxDetails} onChange={e => update('antecedentsFamiliauxDetails', e.target.value)} placeholder="Type, lien de parenté" className="h-9 text-xs" /></FieldGroup>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border/30 pt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Comorbidités</p>
                    <div className="flex flex-wrap gap-2">
                      {(comorbRef.length > 0 ? comorbRef.map(c => c.libelle) : COMORBIDITES_OPTIONS).map(c => (
                        <button
                          key={c} type="button"
                          onClick={() => {
                            const current = form.comorbidites;
                            update('comorbidites', current.includes(c) ? current.filter(x => x !== c) : [...current, c]);
                          }}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                            form.comorbidites.includes(c)
                              ? 'bg-primary/10 text-primary border-primary/30'
                              : 'bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted'
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <FieldGroup><Label>Symptômes</Label><Textarea value={form.symptomes} onChange={e => update('symptomes', e.target.value)} rows={2} placeholder="Décrire les symptômes..." /></FieldGroup>
                  <FieldGroup><Label>Notes</Label><Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} placeholder="Notes complémentaires..." /></FieldGroup>
                </div>
              </>
            )}

            {/* Step 9: Documents */}
            {stepId === 'documents' && (
              <>
                <StepHeader icon={FolderOpen} title="Documents du Patient" />
                {savedPatientId ? (
                  <PatientFileUpload patientId={savedPatientId} caseId={savedCaseId || undefined} />
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-4 px-3 rounded-xl bg-muted/50 border border-border/40">
                      <AlertTriangle size={28} className="mx-auto mb-2 text-amber-500" />
                      <p className="text-sm font-semibold">Enregistrez d'abord le cas</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Vous pourrez ensuite uploader tous les documents ci-dessous
                      </p>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Types de documents supportés</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {DOC_TYPES_PREVIEW.map(t => (
                        <div
                          key={t.value}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/40 opacity-60 text-center"
                        >
                          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', t.color)}>
                            <t.icon size={18} />
                          </div>
                          <span className="text-[11px] font-medium leading-tight">{t.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bottom navigation - fixed on mobile */}
        <div className="fixed bottom-0 left-0 right-0 md:static md:mt-4 bg-card/95 backdrop-blur-md border-t md:border-t-0 border-border p-3 md:p-0 z-40 flex items-center justify-between gap-2"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="h-10 px-4"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline ml-1">Précédent</span>
          </Button>

          {/* Step indicator mobile */}
          <span className="text-xs text-muted-foreground font-medium md:hidden">
            {currentStep + 1} / {STEPS.length}
          </span>

          {isDocStep && savedPatientId ? (
            <Button onClick={() => navigate('/cas')} className="h-10 px-6">
              Terminer <ArrowRight size={16} className="ml-1" />
            </Button>
          ) : isLastFormStep || isDocStep ? (
            <Button
              onClick={handleSubmit}
              disabled={loading || errorCount > 0 || !!savedPatientId}
              className="h-10 px-6"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {savedPatientId ? '✅ Enregistré' : <>
                <Save size={16} className="mr-1" /> Enregistrer
              </>}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
              className="h-10 px-6"
            >
              Suivant <ChevronRight size={16} className="ml-1" />
            </Button>
          )}
        </div>
      </div>
      <GlobalVoiceButton currentForm={form as any} onFieldsExtracted={handleVoiceFields} />
    </AppLayout>
  );
}

function StepHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-2 border-b border-border/30">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon size={16} className="text-primary" />
      </div>
      <h2 className="font-display font-semibold text-sm">{title}</h2>
    </div>
  );
}

function FieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('space-y-1.5', className)}>{children}</div>;
}
