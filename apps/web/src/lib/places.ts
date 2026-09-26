/** Coordinates for the demo logistics network and common destinations. */
export const PLACES: Record<string, [number, number]> = {
  "new york": [40.71, -74.0],
  brooklyn: [40.68, -73.94],
  nashville: [36.16, -86.78],
  "los angeles": [34.05, -118.24],
  "san francisco": [37.77, -122.42],
  chicago: [41.88, -87.63],
  austin: [30.27, -97.74],
  seattle: [47.61, -122.33],
  portland: [45.52, -122.68],
  denver: [39.74, -104.99],
  boston: [42.36, -71.06],
  philadelphia: [39.95, -75.17],
  atlanta: [33.75, -84.39],
  minneapolis: [44.98, -93.27],
  miami: [25.76, -80.19],
  toronto: [43.65, -79.38],
  london: [51.51, -0.13],
  lisbon: [38.72, -9.14],
  porto: [41.15, -8.61],
  berlin: [52.52, 13.4],
  paris: [48.86, 2.35],
  sydney: [-33.87, 151.21],
};

export function lookupPlace(city: string | null | undefined): [number, number] | null {
  if (!city) return null;
  return PLACES[city.trim().toLowerCase()] ?? null;
}
