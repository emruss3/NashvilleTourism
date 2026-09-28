/**
 * Landmarks drawn on the hotels map so a visitor can read where a stay sits
 * relative to the places they came for. Editable content: planning
 * coordinates for the centre of each place, not surveyed points.
 *
 * `kind` picks the glyph. A `district` is drawn as a soft shaded area with
 * the name inside it (radius in metres); everything else is a point.
 * `weight` 1 = always shown; 2 = shown once the map is zoomed to a district.
 */
export type LandmarkKind = 'district' | 'music' | 'arena' | 'stadium' | 'park' | 'university' | 'airport' | 'museum' | 'civic';

export interface MapLandmark {
  name: string;
  lat: number;
  lng: number;
  kind: LandmarkKind;
  weight: 1 | 2;
  /** Districts only: shaded radius in metres. */
  radiusM?: number;
}

export const MAP_LANDMARKS: MapLandmark[] = [
  // Districts (shaded)
  { name: 'Lower Broadway', lat: 36.1606, lng: -86.7768, kind: 'district', weight: 1, radiusM: 320 },
  { name: 'The Gulch', lat: 36.1522, lng: -86.7862, kind: 'district', weight: 1, radiusM: 380 },
  { name: 'Music Row', lat: 36.1493, lng: -86.793, kind: 'district', weight: 1, radiusM: 380 },
  { name: 'Germantown', lat: 36.174, lng: -86.79, kind: 'district', weight: 1, radiusM: 420 },
  { name: '12 South', lat: 36.1245, lng: -86.7895, kind: 'district', weight: 1, radiusM: 380 },
  { name: 'Five Points', lat: 36.177, lng: -86.748, kind: 'district', weight: 1, radiusM: 380 },
  { name: 'Midtown', lat: 36.15, lng: -86.801, kind: 'district', weight: 2, radiusM: 400 },
  { name: 'Wedgewood-Houston', lat: 36.137, lng: -86.769, kind: 'district', weight: 2, radiusM: 420 },
  { name: 'Music Valley', lat: 36.211, lng: -86.693, kind: 'district', weight: 1, radiusM: 900 },
  // Music
  { name: 'Ryman Auditorium', lat: 36.1612, lng: -86.7785, kind: 'music', weight: 1 },
  { name: 'Grand Ole Opry', lat: 36.2069, lng: -86.6921, kind: 'music', weight: 1 },
  { name: 'Ascend Amphitheater', lat: 36.1583, lng: -86.7727, kind: 'music', weight: 2 },
  { name: 'Country Music Hall of Fame', lat: 36.1584, lng: -86.7761, kind: 'museum', weight: 2 },
  // Arenas and stadiums
  { name: 'Bridgestone Arena', lat: 36.1592, lng: -86.7785, kind: 'arena', weight: 1 },
  { name: 'Nissan Stadium', lat: 36.1665, lng: -86.7713, kind: 'stadium', weight: 1 },
  { name: 'First Horizon Park', lat: 36.1734, lng: -86.7889, kind: 'stadium', weight: 2 },
  { name: 'Geodis Park', lat: 36.1305, lng: -86.766, kind: 'stadium', weight: 2 },
  // Civic and campuses
  { name: 'Music City Center', lat: 36.1568, lng: -86.7768, kind: 'civic', weight: 1 },
  { name: 'State Capitol', lat: 36.1659, lng: -86.7844, kind: 'civic', weight: 2 },
  { name: 'Nashville Yards', lat: 36.1597, lng: -86.7845, kind: 'civic', weight: 2 },
  { name: 'Vanderbilt University', lat: 36.1447, lng: -86.8027, kind: 'university', weight: 1 },
  { name: 'Belmont University', lat: 36.133, lng: -86.795, kind: 'university', weight: 2 },
  // Parks and transit
  { name: 'Centennial Park', lat: 36.1497, lng: -86.8131, kind: 'park', weight: 1 },
  { name: 'Nashville Airport (BNA)', lat: 36.1263, lng: -86.6774, kind: 'airport', weight: 1 },
];
