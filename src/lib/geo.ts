/** Small geography helpers for the hotel marketplace. Planning precision only. */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Davidson County, TN. Marketplace results outside it are dropped. */
export const DAVIDSON_COUNTY_BOUNDS = { minLat: 35.97, maxLat: 36.41, minLng: -87.06, maxLng: -86.52 } as const;

/** Lower Broadway at Fifth: the default "distance to" point when no area is active. */
export const LOWER_BROADWAY: LatLng = { lat: 36.1612, lng: -86.7775 };

export function inDavidsonCounty(point: LatLng): boolean {
  return (
    point.lat >= DAVIDSON_COUNTY_BOUNDS.minLat &&
    point.lat <= DAVIDSON_COUNTY_BOUNDS.maxLat &&
    point.lng >= DAVIDSON_COUNTY_BOUNDS.minLng &&
    point.lng <= DAVIDSON_COUNTY_BOUNDS.maxLng
  );
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "0.4 km" under a kilometre, "2.3 km" above; walking minutes at 80 m/min for short hops. */
export function distanceLabel(km: number): string {
  if (km < 1.6) return `${Math.max(1, Math.round((km * 1000) / 80))} min walk`;
  return `${km.toFixed(1)} km`;
}
