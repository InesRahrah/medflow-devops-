/**
 * Region Coordinates Mapping for Tunisia
 * Uses Leaflet + OpenStreetMap
 */

export interface RegionCoord {
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  zoom: number;
}

export const REGION_COORDINATES: { [key: string]: RegionCoord } = {
  TUNIS: {
    name: 'Tunis',
    region: 'TUNIS',
    latitude: 36.8065,
    longitude: 10.1815,
    zoom: 13
  },
  SOUSSE: {
    name: 'Sousse',
    region: 'SOUSSE',
    latitude: 35.8256,
    longitude: 10.6369,
    zoom: 13
  },
  SFAX: {
    name: 'Sfax',
    region: 'SFAX',
    latitude: 34.7406,
    longitude: 10.7603,
    zoom: 13
  },
  GAFSA: {
    name: 'Gafsa',
    region: 'GAFSA',
    latitude: 34.4261,
    longitude: 8.7852,
    zoom: 13
  },
  KEF: {
    name: 'Le Kef',
    region: 'KEF',
    latitude: 36.1715,
    longitude: 8.7099,
    zoom: 13
  },
  MEDENINE: {
    name: 'Médenine',
    region: 'MEDENINE',
    latitude: 33.3613,
    longitude: 10.4969,
    zoom: 13
  },
  KAIROUAN: {
    name: 'Kairouan',
    region: 'KAIROUAN',
    latitude: 35.6781,
    longitude: 10.0982,
    zoom: 13
  },
  BIZERTE: {
    name: 'Bizerte',
    region: 'BIZERTE',
    latitude: 37.2742,
    longitude: 9.8739,
    zoom: 13
  },
  GABES: {
    name: 'Gabès',
    region: 'GABES',
    latitude: 33.8869,
    longitude: 10.0994,
    zoom: 13
  },
  MONASTIR: {
    name: 'Monastir',
    region: 'MONASTIR',
    latitude: 35.7694,
    longitude: 10.8146,
    zoom: 13
  },
  MAHDIA: {
    name: 'Mahdia',
    region: 'MAHDIA',
    latitude: 35.5047,
    longitude: 11.0659,
    zoom: 13
  }
};

/**
 * Get coordinates for a region
 */
export function getRegionCoordinates(regionName: string): RegionCoord | null {
  if (!regionName) return null;
  
  const key = regionName.toUpperCase().trim();
  return REGION_COORDINATES[key] || null;
}

/**
 * Get default Tunisia center coordinates
 */
export function getTunisiaCenter(): RegionCoord {
  return {
    name: 'Tunisia',
    region: 'TUNISIA',
    latitude: 35.5,
    longitude: 10.0,
    zoom: 6
  };
}

/**
 * Calculate distance between two points (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
