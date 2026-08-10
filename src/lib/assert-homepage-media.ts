import fs from 'node:fs';
import path from 'node:path';
import { images, AVAILABLE_MEDIA, type ImageKey, type MediaAsset } from '@/lib/media';

/** Homepage placements that must resolve to unique file sources. */
export const HOMEPAGE_IMAGE_KEYS: readonly ImageKey[] = [
  'hero/downtown-rooftop',
  'hub/hotels',
  'hub/restaurants',
  'hub/live-music',
  'hub/tours',
  'hub/tickets',
  'hub/weekend',
  'editorial/live-music-crowd',
  'editorial/skyline',
  'editorial/broadway-nightlife',
  'editorial/opryland-atrium',
  'editorial/parthenon-west-end',
] as const;

const NEIGHBORHOOD_KEYS = Object.keys(images).filter((k) =>
  k.startsWith('neighborhood/'),
) as ImageKey[];

function publicFileExists(src: string): boolean {
  const rel = src.replace(/^\//, '');
  return fs.existsSync(path.join(process.cwd(), 'public', rel));
}

function asAsset(key: string): MediaAsset | undefined {
  return images[key as ImageKey] as MediaAsset | undefined;
}

/**
 * Development / build-time media integrity checks for the homepage media plan.
 * Throws with a readable multi-line message when any assertion fails.
 */
export function assertHomepageMediaIntegrity(): void {
  const errors: string[] = [];

  for (const key of AVAILABLE_MEDIA) {
    if (key === 'hero/video') continue;
    const asset = asAsset(key);
    if (!asset) {
      errors.push(`AVAILABLE_MEDIA key "${key}" is not present in images.`);
      continue;
    }
    if (!publicFileExists(asset.src)) {
      errors.push(`AVAILABLE_MEDIA key "${key}" file missing: ${asset.src}`);
    }
    if (asset.srcMobile && !publicFileExists(asset.srcMobile)) {
      errors.push(`AVAILABLE_MEDIA key "${key}" mobile file missing: ${asset.srcMobile}`);
    }
  }

  // Homepage keys may intentionally fall back until commercially cleared.
  // Only cleared+approved keys (AVAILABLE_MEDIA) are required to resolve uniquely.
  const srcToKeys = new Map<string, string[]>();
  for (const key of HOMEPAGE_IMAGE_KEYS) {
    const asset = asAsset(key);
    if (!asset) {
      errors.push(`Homepage key "${key}" missing from images.`);
      continue;
    }
    if (!asset.licence) {
      errors.push(`Homepage key "${key}" is missing rights / licence note.`);
    }
    if (!AVAILABLE_MEDIA.has(key)) {
      continue;
    }
    // Third-party licences require a visible-in-registry credit. Owned BPH
    // photography does not: /photo-credits states it carries no public
    // photographer attribution, so the licence note alone satisfies rights.
    const isOwnedMedia = (asset.licence ?? '').includes('BPH-owned');
    if (!asset.credit && !isOwnedMedia) {
      errors.push(`Homepage key "${key}" is missing credit.`);
    }
    const list = srcToKeys.get(asset.src) ?? [];
    list.push(key);
    srcToKeys.set(asset.src, list);
  }
  for (const [src, keys] of srcToKeys) {
    if (keys.length > 1) {
      errors.push(`Homepage placements share the same src (${src}): ${keys.join(', ')}`);
    }
  }

  const neighborhoodSrc = new Map<string, string[]>();
  for (const key of NEIGHBORHOOD_KEYS) {
    if (!AVAILABLE_MEDIA.has(key)) continue;
    const asset = asAsset(key);
    if (!asset) continue;
    const list = neighborhoodSrc.get(asset.src) ?? [];
    list.push(key);
    neighborhoodSrc.set(asset.src, list);
  }
  for (const [src, keys] of neighborhoodSrc) {
    if (keys.length > 1) {
      errors.push(`Neighborhood assets cross-used (${src}): ${keys.join(', ')}`);
    }
  }

  if (errors.length) {
    throw new Error(`Media integrity assertions failed:\n- ${errors.join('\n- ')}`);
  }
}
