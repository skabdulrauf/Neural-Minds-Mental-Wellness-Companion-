import { LocationData, Professional } from '../utils/types';

export async function getUserLocation(): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const locationData = await reverseGeocode(latitude, longitude);
          resolve(locationData);
        } catch {
          resolve({ lat: latitude, lon: longitude });
        }
      },
      (error) => {
        if (error.code === 1) reject(new Error('Location access was declined'));
        else if (error.code === 2) reject(new Error('Location unavailable'));
        else reject(new Error('Location request timed out'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

async function reverseGeocode(lat: number, lon: number): Promise<LocationData> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'NeuralMinds/1.0 (Mental Health Support App)',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    if (!response.ok) throw new Error('Geocoding failed');

    const data = await response.json();
    return {
      lat,
      lon,
      city: data.address?.city || data.address?.town || data.address?.village || data.address?.county || data.address?.suburb,
      state: data.address?.state || data.address?.region,
      country: data.address?.country,
      countryCode: data.address?.country_code?.toUpperCase(),
    };
  } catch {
    return { lat, lon };
  }
}

export async function findNearbyProfessionals(lat: number, lon: number): Promise<Professional[]> {
  const radiusMeters = 20000;

  // Broad query: all hospitals, clinics, doctors, pharmacies, AND mental health specifics
  const query = `
    [out:json][timeout:30];
    (
      node["amenity"="hospital"](around:${radiusMeters},${lat},${lon});
      way["amenity"="hospital"](around:${radiusMeters},${lat},${lon});
      node["amenity"="clinic"](around:${radiusMeters},${lat},${lon});
      way["amenity"="clinic"](around:${radiusMeters},${lat},${lon});
      node["amenity"="doctors"](around:${radiusMeters},${lat},${lon});
      node["healthcare"="hospital"](around:${radiusMeters},${lat},${lon});
      way["healthcare"="hospital"](around:${radiusMeters},${lat},${lon});
      node["healthcare"="clinic"](around:${radiusMeters},${lat},${lon});
      node["healthcare"="doctor"](around:${radiusMeters},${lat},${lon});
      node["healthcare"="psychologist"](around:${radiusMeters},${lat},${lon});
      node["healthcare"="psychiatrist"](around:${radiusMeters},${lat},${lon});
      node["healthcare"="counselling"](around:${radiusMeters},${lat},${lon});
      node["healthcare"="therapist"](around:${radiusMeters},${lat},${lon});
      node["healthcare"="pharmacy"](around:${radiusMeters},${lat},${lon});
      node["amenity"="pharmacy"](around:${radiusMeters},${lat},${lon});
      node["healthcare:speciality"="psychiatry"](around:${radiusMeters},${lat},${lon});
      node["healthcare:speciality"="psychology"](around:${radiusMeters},${lat},${lon});
      node["office"="therapist"](around:${radiusMeters},${lat},${lon});
      node["social_facility"="counselling"](around:${radiusMeters},${lat},${lon});
    );
    out body center;
  `;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Fallback server
      response = await fetch('https://overpass.kumi.systems/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if (!response.ok) throw new Error('Overpass API error');
    }

    const data = await response.json();
    return processOverpassResults(data, lat, lon);
  } catch (error) {
    console.warn('Overpass query failed:', error);
    return [];
  }
}

function processOverpassResults(data: any, userLat: number, userLon: number): Professional[] {
  if (!data.elements || !Array.isArray(data.elements)) return [];

  const seen = new Set<string>();

  const professionals: Professional[] = data.elements
    .filter((el: any) => el.tags?.name)
    .map((el: any) => {
      const elLat = el.lat || el.center?.lat;
      const elLon = el.lon || el.center?.lon;
      const tags = el.tags;

      return {
        name: tags.name,
        type: formatType(tags),
        address: formatAddress(tags),
        phone: tags.phone || tags['contact:phone'] || tags['phone:mobile'] || undefined,
        website: tags.website || tags['contact:website'] || undefined,
        openingHours: tags.opening_hours || undefined,
        description: buildDescription(tags),
        lat: elLat,
        lon: elLon,
        distance: elLat && elLon ? calculateDistance(userLat, userLon, elLat, elLon) : undefined,
      };
    })
    .filter((p: Professional) => {
      if (!p.lat || !p.lon) return false;
      // Deduplicate by name+type
      const key = `${p.name}|${p.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a: Professional, b: Professional) => (a.distance || 999) - (b.distance || 999))
    .slice(0, 30);

  return professionals;
}

function formatType(tags: any): string {
  if (tags['healthcare:speciality']) {
    const spec = tags['healthcare:speciality'];
    if (spec.includes('psychiatry')) return 'Psychiatrist';
    if (spec.includes('psychology')) return 'Psychologist';
    if (spec.includes('cardiology')) return 'Cardiology';
    if (spec.includes('general')) return 'General Practice';
  }
  if (tags.healthcare === 'psychologist') return 'Psychologist';
  if (tags.healthcare === 'psychiatrist') return 'Psychiatrist';
  if (tags.healthcare === 'counselling') return 'Counselor';
  if (tags.healthcare === 'therapist') return 'Therapist';
  if (tags.healthcare === 'pharmacy' || tags.amenity === 'pharmacy') return 'Pharmacy';
  if (tags.amenity === 'hospital' || tags.healthcare === 'hospital') return 'Hospital';
  if (tags.amenity === 'clinic' || tags.healthcare === 'clinic') return 'Clinic';
  if (tags.amenity === 'doctors' || tags.healthcare === 'doctor') return 'Doctor';
  if (tags.office === 'therapist') return 'Therapy Practice';
  return 'Healthcare';
}

function buildDescription(tags: any): string | undefined {
  const parts: string[] = [];
  if (tags.description) parts.push(tags.description);
  if (tags.operator) parts.push(`Operated by ${tags.operator}`);
  if (tags.beds) parts.push(`${tags.beds} beds`);
  if (tags.emergency === 'yes') parts.push('Emergency services available');
  if (tags.wheelchair === 'yes') parts.push('Wheelchair accessible');
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function formatAddress(tags: any): string | undefined {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:city'],
    tags['addr:postcode']
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function isIndianUser(location: LocationData | null): boolean {
  if (!location) return false;
  return location.countryCode === 'IN';
}

export function openInGoogleMaps(lat: number, lon: number, name?: string): void {
  const q = name ? encodeURIComponent(name) : `${lat},${lon}`;
  window.open(`https://www.google.com/maps/search/${q}/@${lat},${lon},17z`, '_blank');
}

export function openDirectionsGoogleMaps(fromLat: number, fromLon: number, toLat: number, toLon: number): void {
  window.open(`https://www.google.com/maps/dir/${fromLat},${fromLon}/${toLat},${toLon}`, '_blank');
}
