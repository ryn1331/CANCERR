
-- ============================================
-- 1. Nouvelles colonnes "Styles de vie" sur cancer_cases
-- ============================================
ALTER TABLE public.cancer_cases
  ADD COLUMN IF NOT EXISTS poids_kg numeric(5,1),
  ADD COLUMN IF NOT EXISTS taille_cm numeric(5,1),
  ADD COLUMN IF NOT EXISTS imc numeric(4,1),
  ADD COLUMN IF NOT EXISTS alimentation text,
  ADD COLUMN IF NOT EXISTS activite_physique text DEFAULT 'sedentaire',
  ADD COLUMN IF NOT EXISTS expositions_professionnelles text,
  ADD COLUMN IF NOT EXISTS antecedents_familiaux text DEFAULT 'non',
  ADD COLUMN IF NOT EXISTS antecedents_familiaux_details text,
  ADD COLUMN IF NOT EXISTS comorbidites text[];

-- ============================================
-- 2. Table cancer_descriptors (descripteurs dynamiques)
-- ============================================
CREATE TABLE IF NOT EXISTS public.cancer_descriptors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL, -- type_cancer, sous_type, methode_diagnostic, grade
  code text NOT NULL,
  label text NOT NULL,
  parent_code text, -- pour sous-types liés à un type_cancer
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cancer_descriptors ENABLE ROW LEVEL SECURITY;

-- Tout utilisateur authentifié peut lire
CREATE POLICY "Authenticated can view descriptors"
  ON public.cancer_descriptors FOR SELECT
  TO authenticated USING (true);

-- Seul l'admin peut modifier
CREATE POLICY "Admin can manage descriptors"
  ON public.cancer_descriptors FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 3. Seed data : types de cancer
-- ============================================
INSERT INTO public.cancer_descriptors (category, code, label, sort_order) VALUES
  ('type_cancer', 'poumon', 'Poumon', 1),
  ('type_cancer', 'colorectal', 'Colorectal', 2),
  ('type_cancer', 'sein', 'Sein', 3),
  ('type_cancer', 'prostate', 'Prostate', 4),
  ('type_cancer', 'vessie', 'Vessie', 5),
  ('type_cancer', 'estomac', 'Estomac', 6),
  ('type_cancer', 'foie', 'Foie', 7),
  ('type_cancer', 'pancreas', 'Pancréas', 8),
  ('type_cancer', 'rein', 'Rein', 9),
  ('type_cancer', 'thyroide', 'Thyroïde', 10),
  ('type_cancer', 'leucemie', 'Leucémie', 11),
  ('type_cancer', 'lymphome', 'Lymphome', 12),
  ('type_cancer', 'melanome', 'Mélanome', 13),
  ('type_cancer', 'col_uterin', 'Col utérin', 14),
  ('type_cancer', 'ovaire', 'Ovaire', 15),
  ('type_cancer', 'cavite_buccale', 'Cavité buccale', 16),
  ('type_cancer', 'larynx', 'Larynx', 17),
  ('type_cancer', 'oesophage', 'Œsophage', 18),
  ('type_cancer', 'cerveau_snc', 'Cerveau/SNC', 19),
  ('type_cancer', 'sarcome', 'Sarcome', 20),
  ('type_cancer', 'myelome', 'Myélome', 21),
  ('type_cancer', 'autre', 'Autre', 99);

-- Seed data : méthodes diagnostiques
INSERT INTO public.cancer_descriptors (category, code, label, sort_order) VALUES
  ('methode_diagnostic', 'histologie', 'Histologie', 1),
  ('methode_diagnostic', 'cytologie', 'Cytologie', 2),
  ('methode_diagnostic', 'imagerie', 'Imagerie', 3),
  ('methode_diagnostic', 'biologie', 'Biologie / Marqueurs', 4),
  ('methode_diagnostic', 'clinique', 'Clinique uniquement', 5),
  ('methode_diagnostic', 'autopsie', 'Autopsie', 6),
  ('methode_diagnostic', 'dcmr', 'DCM / Registre', 7);

-- Seed data : grades
INSERT INTO public.cancer_descriptors (category, code, label, sort_order) VALUES
  ('grade', 'g1', 'G1 - Bien différencié', 1),
  ('grade', 'g2', 'G2 - Moyennement différencié', 2),
  ('grade', 'g3', 'G3 - Peu différencié', 3),
  ('grade', 'g4', 'G4 - Indifférencié', 4),
  ('grade', 'gx', 'GX - Non évaluable', 5);

-- ============================================
-- 4. Index de performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cancer_cases_patient ON public.cancer_cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_cancer_cases_type ON public.cancer_cases(type_cancer);
CREATE INDEX IF NOT EXISTS idx_cancer_descriptors_cat ON public.cancer_descriptors(category, is_active, sort_order);

-- ============================================
-- 5. Policy profiles : SELECT pour tous les authenticated
-- ============================================
CREATE POLICY "Authenticated can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated USING (true);
