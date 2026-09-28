/**
 * Landmarks drawn on the hotels map so a visitor can read where a stay sits
 * relative to the places they came for. Editable content: planning
 * coordinates for the centre of each place, not surveyed points.
 * `weight` 1 = always shown; 2 = shown once the map is zoomed to a district.
 */
export interface MapLandmark {
  name: string;
  lat: number;
  lng: number;
  weight: 1 | 2;
}

export const MAP_LANDMARKS: MapLandmark[] = [
  { name: 'Lower Broadway', lat: 36.1608, lng: -86.7772, weight: 1 },
  { name: 'Bridgestone Arena', lat: 36.1592, lng: -86.7785, weight: 1 },
  { name: 'Ryman Auditorium', lat: 36.1612, lng: -86.7785, weight: 2 },
  { name: 'Nissan Stadium', lat: 36.1665, lng: -86.7713, weight: 1 },
  { name: 'Music City Center', lat: 36.1568, lng: -86.7768, weight: 1 },
  { name: 'Country Music Hall of Fame', lat: 36.1584, lng: -86.7761, weight: 2 },
  { name: 'Ascend Amphitheater', lat: 36.1583, lng: -86.7727, weight: 2 },
  { name: 'Nashville Yards', lat: 36.1597, lng: -86.7845, weight: 2 },
  { name: 'State Capitol', lat: 36.1659, lng: -86.7844, weight: 2 },
  { name: 'The Gulch', lat: 36.1522, lng: -86.7862, weight: 1 },
  { name: 'Music Row', lat: 36.1493, lng: -86.793, weight: 1 },
  { name: 'Vanderbilt University', lat: 36.1447, lng: -86.8027, weight: 1 },
  { name: 'Centennial Park', lat: 36.1497, lng: -86.8131, weight: 1 },
  { name: 'Belmont University', lat: 36.133, lng: -86.795, weight: 2 },
  { name: '12 South', lat: 36.1245, lng: -86.7895, weight: 1 },
  { name: 'Germantown', lat: 36.174, lng: -86.79, weight: 1 },
  { name: 'First Horizon Park', lat: 36.1734, lng: -86.7889, weight: 2 },
  { name: 'Five Points, East Nashville', lat: 36.177, lng: -86.748, weight: 1 },
  { name: 'Geodis Park', lat: 36.1305, lng: -86.766, weight: 2 },
  { name: 'Grand Ole Opry', lat: 36.2069, lng: -86.6921, weight: 1 },
  { name: 'Opry Mills', lat: 36.2072, lng: -86.697, weight: 2 },
  { name: 'Nashville Airport (BNA)', lat: 36.1263, lng: -86.6774, weight: 1 },
];
