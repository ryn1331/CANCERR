
-- Reference tables for paramétrable fields

-- Effets indésirables graves
CREATE TABLE public.effets_indesirables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle text NOT NULL,
  code text,
  actif boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.effets_indesirables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view effets" ON public.effets_indesirables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage effets" ON public.effets_indesirables FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Antécédents
CREATE TABLE public.antecedents_ref (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle text NOT NULL,
  code text,
  actif boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.antecedents_ref ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view antecedents" ON public.antecedents_ref FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage antecedents" ON public.antecedents_ref FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Comorbidités référence
CREATE TABLE public.comorbidites_ref (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle text NOT NULL,
  code text,
  actif boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.comorbidites_ref ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view comorbidites" ON public.comorbidites_ref FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage comorbidites" ON public.comorbidites_ref FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Cancers référence (solides + liquides/hémopathies)
CREATE TABLE public.cancers_ref (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  code text,
  type_categorie text NOT NULL DEFAULT 'solide', -- 'solide' ou 'liquide'
  actif boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cancers_ref ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view cancers_ref" ON public.cancers_ref FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage cancers_ref" ON public.cancers_ref FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Localités référence
CREATE TABLE public.localites_ref (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  code text,
  actif boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.localites_ref ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view localites" ON public.localites_ref FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage localites" ON public.localites_ref FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add hemopathie columns to cancer_cases
ALTER TABLE public.cancer_cases 
  ADD COLUMN IF NOT EXISTS diagnostic_hemato text,
  ADD COLUMN IF NOT EXISTS diagnostic_hemato_code text,
  ADD COLUMN IF NOT EXISTS examens_complementaires text,
  ADD COLUMN IF NOT EXISTS is_hemopathie boolean NOT NULL DEFAULT false;
