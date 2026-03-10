import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `Tu es un épidémiologiste international expert en oncologie, spécialisé dans l'analyse des registres mondiaux du cancer (GLOBOCAN/IARC, SEER, WHO, CI5). 

Tu dois TOUJOURS répondre avec un JSON valide (pas de texte avant ou après) contenant exactement cette structure :

{
  "cancer_type_label": "Nom complet du cancer",
  "summary": "Résumé exécutif de 3-4 paragraphes",
  "global_overview": {
    "total_cases_2022": number,
    "total_deaths_2022": number,
    "asr_incidence": number,
    "asr_mortality": number,
    "rank_worldwide": number,
    "percentage_all_cancers": number
  },
  "historical_data": [
    {"year": 2010, "world_incidence": number, "world_mortality": number, "africa_incidence": number, "north_africa_incidence": number, "algeria_incidence": number, "algeria_mortality": number, "asr_world": number, "asr_algeria": number}
  ],
  "predictions": [
    {"year": 2025, "world_incidence": number, "algeria_incidence": number, "algeria_mortality": number, "asr_algeria": number, "confidence_lower": number, "confidence_upper": number}
  ],
  "regional_comparison": [
    {"region": "string", "asr_incidence": number, "asr_mortality": number, "trend": "hausse|baisse|stable"}
  ],
  "risk_factors": [
    {"factor": "string", "impact": "élevé|modéré|faible", "prevalence_algeria": "string", "description": "string"}
  ],
  "age_distribution": [
    {"age_group": "string", "percentage": number}
  ],
  "sex_ratio": {"male_percentage": number, "female_percentage": number},
  "methodology": "Description de la méthodologie utilisée",
  "recommendations": ["string"],
  "sources": ["string"]
}

IMPORTANT :
- Les données historiques doivent couvrir 2010-2024 (15 ans)
- Les prédictions doivent couvrir 2025-2030 (5 ans)
- Utilise les données réelles de GLOBOCAN 2022, IARC CI5, et les registres algériens publiés
- Les taux ASR sont pour 100 000 habitants, standardisés sur la population mondiale
- Pour les prédictions, utilise la méthode APC (Annual Percent Change) et projection linéaire/exponentielle
- Inclus les intervalles de confiance à 95% pour les prédictions
- Les régions doivent inclure : Monde, Europe, Amérique du Nord, Asie, Afrique, Afrique du Nord, Algérie
- Sois précis avec les chiffres, base-toi sur GLOBOCAN 2022 et les publications IARC`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { cancer_type } = await req.json();

    if (!cancer_type) {
      return new Response(
        JSON.stringify({ error: 'cancer_type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('MISTRAL_API_KEY') || 'ixKgnsIO65PHEqksvtPpYnUQofiMVLlO';
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Analyse complète du "${cancer_type}" avec données GLOBOCAN 2022, séries temporelles 2010-2024, et prédictions 2025-2030. Focus sur l'Algérie et l'Afrique du Nord. Réponds UNIQUEMENT en JSON valide.`;

    const aiResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Trop de requêtes, réessayez.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Crédits IA épuisés.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI error: ${await aiResponse.text()}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || '';
    
    // Clean markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', raw: content.substring(0, 500) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
