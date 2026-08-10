#!/usr/bin/env node

/**
 * Import a Foursquare OS Places Portal JSONL export into Nashroam Supabase.
 *
 * Usage:
 *   node scripts/import-fsq-os.mjs categories fsq-categories.jsonl
 *   node scripts/import-fsq-os.mjs places fsq-nashville-places.jsonl
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * This script stages data only. It never publishes canonical Nashroam places.
 */

import fs from 'node:fs';
import readline from 'node:readline';
import { createClient } from '@supabase/supabase-js';

const [kind, filePath] = process.argv.slice(2);
if (!['categories', 'places'].includes(kind) || !filePath) {
  console.error('Usage: node scripts/import-fsq-os.mjs <categories|places> <jsonl-file>');
  process.exit(2);
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(2);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(2);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SOURCE_KEY = 'foursquare_os';
const BATCH_SIZE = 500;

function arr(value) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function categoryRow(r) {
  return {
    category_id: String(r.category_id),
    category_level: r.category_level == null ? null : Number(r.category_level),
    category_name: r.category_name ?? null,
    category_label: r.category_label ?? null,
    level1_category_id: r.level1_category_id ?? null,
    level1_category_name: r.level1_category_name ?? null,
    level2_category_id: r.level2_category_id ?? null,
    level2_category_name: r.level2_category_name ?? null,
    level3_category_id: r.level3_category_id ?? null,
    level3_category_name: r.level3_category_name ?? null,
    level4_category_id: r.level4_category_id ?? null,
    level4_category_name: r.level4_category_name ?? null,
    level5_category_id: r.level5_category_id ?? null,
    level5_category_name: r.level5_category_name ?? null,
    level6_category_id: r.level6_category_id ?? null,
    level6_category_name: r.level6_category_name ?? null,
    imported_at: new Date().toISOString(),
  };
}

function placeRow(r) {
  return {
    fsq_place_id: String(r.fsq_place_id),
    name: String(r.name || '').trim(),
    latitude: r.latitude == null ? null : Number(r.latitude),
    longitude: r.longitude == null ? null : Number(r.longitude),
    address: r.address ?? null,
    locality: r.locality ?? null,
    region: r.region ?? null,
    postcode: r.postcode ?? null,
    country: r.country ?? null,
    date_created: r.date_created ?? null,
    date_refreshed: r.date_refreshed ?? null,
    date_closed: r.date_closed ?? null,
    tel: r.tel ?? null,
    website: r.website ?? null,
    email: r.email ?? null,
    facebook_id: r.facebook_id ?? null,
    instagram: r.instagram ?? null,
    twitter: r.twitter ?? null,
    category_ids: arr(r.fsq_category_ids),
    category_labels: arr(r.fsq_category_labels),
    placemaker_url: r.placemaker_url ?? null,
    unresolved_flags: arr(r.unresolved_flags),
    imported_at: new Date().toISOString(),
  };
}

async function sourceId() {
  const { data, error } = await supabase
    .from('data_sources')
    .select('id')
    .eq('provider_key', SOURCE_KEY)
    .single();
  if (error || !data?.id) throw new Error(`Missing ${SOURCE_KEY} data_sources row: ${error?.message || ''}`);
  return data.id;
}

async function startRun(sourceIdValue) {
  const { data, error } = await supabase
    .from('ingestion_runs')
    .insert({
      source_id: sourceIdValue,
      job_type: kind === 'places' ? 'fsq_os_nashville_places_import' : 'fsq_os_categories_import',
      status: 'running',
      metadata: { file: filePath },
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function finishRun(id, status, counts, errorMessage) {
  await supabase
    .from('ingestion_runs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      records_fetched: counts.fetched,
      records_upserted: counts.upserted,
      error_message: errorMessage || null,
      metadata: { file: filePath, kind },
    })
    .eq('id', id);
}

async function flush(rows) {
  if (!rows.length) return 0;
  const table = kind === 'places' ? 'fsq_os_place_candidates' : 'fsq_os_categories';
  const conflict = kind === 'places' ? 'fsq_place_id' : 'category_id';
  const { error } = await supabase.from(table).upsert(rows, { onConflict: conflict });
  if (error) throw error;
  return rows.length;
}

async function main() {
  const sid = await sourceId();
  const runId = await startRun(sid);
  const counts = { fetched: 0, upserted: 0 };
  const batch = [];

  try {
    const input = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input, crlfDelay: Infinity });

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const raw = JSON.parse(trimmed);
      const row = kind === 'places' ? placeRow(raw) : categoryRow(raw);
      if (kind === 'places' && (!row.fsq_place_id || !row.name)) continue;
      if (kind === 'categories' && !row.category_id) continue;

      counts.fetched += 1;
      batch.push(row);
      if (batch.length >= BATCH_SIZE) {
        counts.upserted += await flush(batch.splice(0, batch.length));
        process.stdout.write(`\rImported ${counts.upserted.toLocaleString()} ${kind}...`);
      }
    }

    counts.upserted += await flush(batch.splice(0, batch.length));
    process.stdout.write('\n');

    if (kind === 'places') {
      await supabase
        .from('data_sources')
        .update({ active: true })
        .eq('provider_key', SOURCE_KEY);
    }

    await finishRun(runId, 'succeeded', counts);
    console.log(`Done: fetched ${counts.fetched.toLocaleString()}, upserted ${counts.upserted.toLocaleString()}.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishRun(runId, 'failed', counts, message).catch(() => null);
    console.error(message);
    process.exitCode = 1;
  }
}

await main();
