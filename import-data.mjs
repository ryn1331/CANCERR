// Script to import all data from CSV exports into the new Supabase project
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://yoekvhreahxaxtkuemap.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qIM9JQAny_EHuF2qCf4kBg_I7m7KDPA';

// Login as admin to get an authenticated token (needed for RLS)
async function getAdminToken() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: 'admin@admin.fr', password: '12345678' })
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

let AUTH_TOKEN = null;

function parseCsv(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(';');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j].trim();
      let val = (values[j] || '').trim();
      if (val === '' || val === 'null') val = null;
      else if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (key === 'population' || key === 'annee' || key === 'sort_order' || key === 'duree_minutes' || key === 'poids_kg' || key === 'taille_cm' || key === 'imc') {
        const num = Number(val);
        if (!isNaN(num)) val = num;
      }
      obj[key] = val;
    }
    rows.push(obj);
  }
  return rows;
}

async function upsertData(table, rows, onConflict) {
  if (!rows || rows.length === 0) {
    console.log(`  [SKIP] ${table} — no data`);
    return;
  }
  
  // Split into batches of 50
  const batchSize = 50;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const headers_obj = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    };
    
    const url = `${SUPABASE_URL}/rest/v1/${table}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: headers_obj,
      body: JSON.stringify(batch)
    });
    
    if (!res.ok) {
      const errText = await res.text();
      console.error(`  [ERROR] ${table} batch ${i}: ${res.status} ${errText}`);
    } else {
      inserted += batch.length;
    }
  }
  console.log(`  [OK] ${table} — ${inserted} rows inserted`);
}

async function main() {
  console.log('Logging in as admin...');
  AUTH_TOKEN = await getAdminToken();
  console.log('Authenticated successfully.\n');
  
  const basePath = 'c:\\Users\\PC\\Downloads\\';
  
  // 1. Reference tables first (no FK dependencies)
  console.log('\n=== Reference Tables ===');
  
  console.log('Importing localites_ref...');
  await upsertData('localites_ref', parseCsv(basePath + 'query-results-export-2026-03-10_05-43-42.csv'));
  
  console.log('Importing effets_indesirables...');
  await upsertData('effets_indesirables', parseCsv(basePath + 'query-results-export-2026-03-10_05-43-59.csv'));
  
  console.log('Importing comorbidites_ref...');
  await upsertData('comorbidites_ref', parseCsv(basePath + 'query-results-export-2026-03-10_05-44-06.csv'));
  
  console.log('Importing cancers_ref...');
  await upsertData('cancers_ref', parseCsv(basePath + 'query-results-export-2026-03-10_05-44-13.csv'));
  
  console.log('Importing cancer_descriptors...');
  await upsertData('cancer_descriptors', parseCsv(basePath + 'query-results-export-2026-03-10_05-44-20.csv'));
  
  console.log('Importing population_reference...');
  await upsertData('population_reference', parseCsv(basePath + 'query-results-export-2026-03-10_05-42-19.csv'));
  
  // 2. Patients (before cancer_cases which reference them)
  console.log('\n=== Main Data ===');
  
  console.log('Importing patients...');
  const patients = parseCsv(basePath + 'query-results-export-2026-03-10_05-45-41.csv');
  // Null out created_by since old user IDs don't exist in new project
  patients.forEach(p => { p.created_by = null; });
  await upsertData('patients', patients);
  
  // 3. Cancer cases (reference patients)
  console.log('Importing cancer_cases...');
  const cases = parseCsv(basePath + 'query-results-export-2026-03-10_05-45-26.csv');
  cases.forEach(c => { c.created_by = null; });
  await upsertData('cancer_cases', cases);
  
  // 4. Tables that reference cancer_cases
  console.log('Importing traitements...');
  const traitements = parseCsv(basePath + 'query-results-export-2026-03-10_05-45-11.csv');
  traitements.forEach(t => { t.created_by = null; });
  await upsertData('traitements', traitements);
  
  console.log('Importing rendez_vous...');
  const rdv = parseCsv(basePath + 'query-results-export-2026-03-10_05-44-35.csv');
  rdv.forEach(r => { r.created_by = null; });
  await upsertData('rendez_vous', rdv);
  
  console.log('\n=== Import Complete ===');
}

main().catch(console.error);
