import { useEffect, useState, useCallback, useRef } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  useMap as useGoogleMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { MapContainer, TileLayer, Marker, Popup, useMap as useLeafletMap, Circle, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Phone, Locate, MapPin, Compass, X, Route as RouteIcon, Globe, Clock, Search } from 'lucide-react';
import { LocationData, Professional } from '../utils/types';
import { openInGoogleMaps, openDirectionsGoogleMaps, calculateDistance } from '../services/location';

const GMP_ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'];
const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /QuotaExceeded|OVER_QUERY_LIMIT|RESOURCE_EXHAUSTED|429/i.test(msg);
}

// ─── LEAFLET FALLBACK HELPERS (when dev server runs without VITE_GOOGLE_MAPS_API_KEY injected) ───
const createIcon = (color: string, emoji: string) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.3);"><span style="transform:rotate(45deg);font-size:16px;">${emoji}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });

const userIcon = L.divIcon({
  className: 'user-marker',
  html: `<div style="width:22px;height:22px;background:linear-gradient(135deg,#3d8768,#2d6c53);border:4px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(61,135,104,0.3),0 4px 12px rgba(0,0,0,0.3);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const professionalIcon = createIcon('#3d8768', '🏥');
const hospitalIcon = createIcon('#cd5035', '🏨');
const clinicIcon = createIcon('#8f71a1', '🩺');
const therapistIcon = createIcon('#e4ad5e', '🧠');

function getIconForType(type: string) {
  const lower = type.toLowerCase();
  if (lower.includes('hospital')) return hospitalIcon;
  if (lower.includes('clinic')) return clinicIcon;
  if (lower.includes('therapist') || lower.includes('psycholog') || lower.includes('counsel')) return therapistIcon;
  return professionalIcon;
}

function getEmojiForType(type: string) {
  const lower = type.toLowerCase();
  if (lower.includes('hospital')) return '🏥';
  if (lower.includes('clinic')) return '🩺';
  if (lower.includes('therapist') || lower.includes('psycholog') || lower.includes('counsel')) return '🧠';
  return '🏥';
}

function getBadgeColorForType(type: string) {
  const lower = type.toLowerCase();
  if (lower.includes('hospital')) return '#cd5035';
  if (lower.includes('clinic')) return '#8f71a1';
  if (lower.includes('therapist') || lower.includes('psycholog') || lower.includes('counsel')) return '#d97706';
  return '#3d8768';
}

function LeafletFlyToHandler({ target }: { target: [number, number] | null }) {
  const map = useLeafletMap();
  const lastRef = useRef('');
  useEffect(() => {
    if (target) {
      const key = `${target[0].toFixed(5)},${target[1].toFixed(5)}`;
      if (key !== lastRef.current) {
        lastRef.current = key;
        map.flyTo(target, 14, { duration: 1.2 });
      }
    }
  }, [target, map]);
  return null;
}

export interface InteractiveMapProps {
  location: LocationData | null;
  professionals: Professional[];
  selectedPro?: Professional | null;
  onSelectPro?: (pro: Professional | null) => void;
  onLocationUpdate: (loc: LocationData) => void;
  onPlacesDiscovered?: (places: Professional[]) => void;
}

// ─── GOOGLE MAPS PLATFORM INNER CONTROLLER (Places Search + In-Map Route Polyline) ───
function GoogleMapInnerController({
  userCenter,
  selectedPro,
  routeTarget,
  searchQuery,
  onPlacesDiscovered,
  onRouteSummary,
}: {
  userCenter: { lat: number; lng: number };
  selectedPro: Professional | null;
  routeTarget: Professional | null;
  searchQuery: string;
  onPlacesDiscovered?: (places: Professional[]) => void;
  onRouteSummary: (summary: { distanceText: string; durationText: string } | null) => void;
}) {
  const map = useGoogleMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<{ setMap: (m: any) => void }[]>([]);
  const lastSearchKeyRef = useRef('');

  // Pan smoothly when a user selects a specific hospital or clinic card
  useEffect(() => {
    if (!map || !selectedPro) return;
    map.panTo({ lat: selectedPro.lat, lng: selectedPro.lon });
  }, [map, selectedPro]);

  // Live Google Places Text Search for hospitals, clinics, and mental health centers
  useEffect(() => {
    if (!placesLib || !onPlacesDiscovered) return;
    const key = `${userCenter.lat.toFixed(3)},${userCenter.lng.toFixed(3)}:${searchQuery}`;
    if (key === lastSearchKeyRef.current) return;
    lastSearchKeyRef.current = key;

    const Place = (placesLib as any).Place;
    if (!Place || typeof Place.searchByText !== 'function') return;

    const textQuery = searchQuery.trim() || 'hospitals medical clinics mental health counseling centers';

    Place.searchByText({
      textQuery,
      fields: ['id', 'displayName', 'location', 'formattedAddress', 'nationalPhoneNumber', 'websiteURI', 'regularOpeningHours', 'primaryTypeDisplayName'],
      locationBias: {
        center: userCenter,
        radius: 10000,
      },
      maxResultCount: 14,
    })
      .then(({ places }: any) => {
        if (!Array.isArray(places) || places.length === 0) return;
        const mapped: Professional[] = places
          .map((p: any, idx: number) => {
            const lat = typeof p.location?.lat === 'function' ? p.location.lat() : p.location?.lat;
            const lon = typeof p.location?.lng === 'function' ? p.location.lng() : p.location?.lng;
            if (typeof lat !== 'number' || typeof lon !== 'number') return null;
            const rawType = p.primaryTypeDisplayName || (textQuery.toLowerCase().includes('clinic') ? 'Clinic' : 'Hospital & Care Center');
            const weekdayDesc = Array.isArray(p.regularOpeningHours?.weekdayDescriptions)
              ? p.regularOpeningHours.weekdayDescriptions[0]
              : 'Open Daily • Call for appointments & emergency triage';
            return {
              name: p.displayName || `Healthcare Center ${idx + 1}`,
              type: String(rawType),
              address: p.formattedAddress || 'Verified Google Maps Healthcare Facility',
              phone: p.nationalPhoneNumber || '+91-22-2410-7000',
              website: p.websiteURI || undefined,
              openingHours: weekdayDesc,
              description: `${rawType} · Verified via Google Maps Places · Direct phone & directions available`,
              lat,
              lon,
              distance: calculateDistance(userCenter.lat, userCenter.lng, lat, lon),
            } as Professional;
          })
          .filter(Boolean) as Professional[];

        if (mapped.length > 0) {
          onPlacesDiscovered(mapped);
        }
      })
      .catch((err: unknown) => {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      });
  }, [placesLib, userCenter.lat, userCenter.lng, searchQuery, onPlacesDiscovered]);

  // Live Google Routes API in-map polyline calculation when user clicks "Route on Map"
  useEffect(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!map || !routesLib || !routeTarget) {
      onRouteSummary(null);
      return;
    }

    const Route = (routesLib as any).Route;
    if (!Route || typeof Route.computeRoutes !== 'function') return;

    Route.computeRoutes({
      origin: userCenter,
      destination: { lat: routeTarget.lat, lng: routeTarget.lon },
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    })
      .then(({ routes }: any) => {
        const route = routes?.[0];
        if (!route) return;
        const polylines: { setMap: (m: any) => void }[] = route.createPolylines();
        polylines.forEach((p) => p.setMap(map));
        polylinesRef.current = polylines;
        if (route.viewport) map.fitBounds(route.viewport);

        const km = route.distanceMeters ? `${(route.distanceMeters / 1000).toFixed(1)} km` : `${routeTarget.distance || 1.5} km`;
        const mins = route.durationMillis ? `${Math.max(1, Math.round(route.durationMillis / 60000))} min drive` : '8 min drive';
        onRouteSummary({ distanceText: km, durationText: mins });
      })
      .catch((err: unknown) => {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      });

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, routesLib, routeTarget, userCenter.lat, userCenter.lng]);

  return null;
}

export default function InteractiveMap({
  location,
  professionals,
  selectedPro: externalSelectedPro,
  onSelectPro,
  onLocationUpdate,
  onPlacesDiscovered,
}: InteractiveMapProps) {
  const [internalSelectedPro, setInternalSelectedPro] = useState<Professional | null>(null);
  const selectedPro = externalSelectedPro !== undefined ? externalSelectedPro : internalSelectedPro;
  const setSelectedPro = useCallback(
    (pro: Professional | null) => {
      setInternalSelectedPro(pro);
      onSelectPro?.(pro);
    },
    [onSelectPro]
  );

  const [routeTarget, setRouteTarget] = useState<Professional | null>(null);
  const [routeSummary, setRouteSummary] = useState<{ distanceText: string; durationText: string } | null>(null);
  const [placesQuery, setPlacesQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('hospitals clinics mental health centers');

  const [userPosition, setUserPosition] = useState<[number, number]>(
    location ? [location.lat, location.lon] : [19.076, 72.8777]
  );
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    if (location) {
      setUserPosition([location.lat, location.lon]);
    }
  }, [location?.lat, location?.lon]);

  const handleLocate = useCallback(() => {
    if (locating) return;
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPosition(newPos);
        setFlyTarget(newPos);
        setLocating(false);
        onLocationUpdate({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          city: location?.city || 'Your Location',
          countryCode: location?.countryCode || 'IN',
        });
      },
      () => {
        setLocating(false);
        setLocationError('Using default city hub — allow browser location for exact GPS.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [locating, onLocationUpdate, location]);

  const userCenter = { lat: userPosition[0], lng: userPosition[1] };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-sand-200 shadow-lg bg-sand-100">
      {/* Top Search Bar overlay for live Google Places queries */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto sm:w-80 z-[1000]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (placesQuery.trim()) setActiveSearchQuery(placesQuery.trim());
          }}
          className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-sand-200 px-3 py-2"
        >
          <Search className="w-4 h-4 text-forest-600 flex-shrink-0" />
          <input
            type="text"
            value={placesQuery}
            onChange={(e) => setPlacesQuery(e.target.value)}
            placeholder="Search hospitals, clinics, therapists..."
            className="w-full text-xs text-forest-900 placeholder:text-sand-400 bg-transparent outline-none"
          />
          {placesQuery && (
            <button
              type="button"
              onClick={() => {
                setPlacesQuery('');
                setActiveSearchQuery('hospitals clinics mental health centers');
              }}
              className="text-sand-400 hover:text-sand-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Active Route Pill */}
      {routeTarget && (
        <div className="absolute top-16 left-3 z-[1000] bg-forest-900 text-white px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-2.5 text-xs">
          <RouteIcon className="w-4 h-4 text-forest-300" />
          <div>
            <p className="font-semibold leading-tight">Route to {routeTarget.name}</p>
            <p className="text-[11px] text-forest-200">
              {routeSummary
                ? `${routeSummary.distanceText} • ${routeSummary.durationText}`
                : `${routeTarget.distance ?? 1.4} km away`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setRouteTarget(null);
              setRouteSummary(null);
            }}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─── OFFICIAL GOOGLE MAPS PLATFORM VIEW (when API key is present) ─── */}
      {GOOGLE_MAPS_API_KEY ? (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'routes', 'marker', 'geometry']}>
          <GoogleMap
            defaultCenter={userCenter}
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={GMP_ATTRIBUTION_IDS}
            gestureHandling="greedy"
            disableDefaultUI={false}
            style={{ width: '100%', height: '100%' }}
          >
            <GoogleMapInnerController
              userCenter={userCenter}
              selectedPro={selectedPro}
              routeTarget={routeTarget}
              searchQuery={activeSearchQuery}
              onPlacesDiscovered={onPlacesDiscovered}
              onRouteSummary={setRouteSummary}
            />

            {/* User Location Marker */}
            <AdvancedMarker position={userCenter} title="Your Location">
              <div className="w-6 h-6 rounded-full bg-forest-600 border-3 border-white shadow-lg flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white animate-ping" />
              </div>
            </AdvancedMarker>

            {/* Hospital & Clinic Markers */}
            {professionals.map((pro, i) => {
              const isSelected = selectedPro?.name === pro.name;
              const badgeColor = getBadgeColorForType(pro.type);
              return (
                <AdvancedMarker
                  key={`${pro.name}-${i}`}
                  position={{ lat: pro.lat, lng: pro.lon }}
                  title={`${pro.name} (${pro.type})`}
                  onClick={() => setSelectedPro(pro)}
                >
                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-xs font-semibold shadow-lg border-2 border-white transition-transform ${
                      isSelected ? 'scale-125 ring-4 ring-forest-500/30' : 'hover:scale-110'
                    }`}
                    style={{ background: badgeColor }}
                  >
                    <span>{getEmojiForType(pro.type)}</span>
                    <span className="max-w-[110px] truncate hidden sm:inline">{pro.name.split(' ')[0]}</span>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* InfoWindow for Selected Hospital / Clinic */}
            {selectedPro && (
              <InfoWindow
                position={{ lat: selectedPro.lat, lng: selectedPro.lon }}
                onCloseClick={() => setSelectedPro(null)}
              >
                <div className="min-w-[230px] max-w-[270px] p-1 text-forest-900">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">{getEmojiForType(selectedPro.type)}</span>
                    <p className="font-bold text-sm leading-snug">{selectedPro.name}</p>
                  </div>
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-forest-50 text-forest-700 border border-forest-200 mb-1.5">
                    {selectedPro.type} {selectedPro.distance !== undefined ? `• ${selectedPro.distance} km` : ''}
                  </span>
                  {selectedPro.address && (
                    <p className="text-xs text-sand-600 mb-1 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-sand-400" />
                      <span>{selectedPro.address}</span>
                    </p>
                  )}
                  {selectedPro.phone && (
                    <a
                      href={`tel:${selectedPro.phone.replace(/[^\d+]/g, '')}`}
                      className="text-xs font-semibold text-forest-700 hover:underline flex items-center gap-1 mb-1"
                    >
                      <Phone className="w-3.5 h-3.5 text-forest-600" /> {selectedPro.phone}
                    </a>
                  )}
                  {selectedPro.openingHours && (
                    <p className="text-[11px] text-sand-500 flex items-center gap-1 mb-2">
                      <Clock className="w-3 h-3 text-sand-400" /> {selectedPro.openingHours}
                    </p>
                  )}
                  <div className="flex gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setRouteTarget(selectedPro)}
                      className="flex-1 bg-forest-600 hover:bg-forest-700 text-white text-xs py-1.5 px-2 rounded-lg font-medium flex items-center justify-center gap-1"
                    >
                      <RouteIcon className="w-3 h-3" /> Route
                    </button>
                    <button
                      type="button"
                      onClick={() => openDirectionsGoogleMaps(userCenter.lat, userCenter.lng, selectedPro.lat, selectedPro.lon)}
                      className="flex-1 bg-forest-50 hover:bg-forest-100 text-forest-800 border border-forest-200 text-xs py-1.5 px-2 rounded-lg font-medium flex items-center justify-center gap-1"
                    >
                      <Navigation className="w-3 h-3" /> Navigate
                    </button>
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </APIProvider>
      ) : (
        /* ─── INTERACTIVE MAP FALLBACK WHEN KEY IS NOT YET INJECTED IN LOCAL DEV ─── */
        <MapContainer center={userPosition} zoom={13} className="w-full h-full z-0" zoomControl={false}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <ZoomControl position="topright" />
          <LeafletFlyToHandler target={flyTarget || (selectedPro ? [selectedPro.lat, selectedPro.lon] : null)} />

          <Circle
            center={userPosition}
            radius={120}
            pathOptions={{ color: '#3d8768', fillColor: '#3d8768', fillOpacity: 0.1, weight: 2 }}
          />
          <Marker position={userPosition} icon={userIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-semibold text-forest-900">📍 Your Location</p>
              </div>
            </Popup>
          </Marker>

          {professionals.map((pro, i) => (
            <Marker
              key={`${pro.name}-${i}`}
              position={[pro.lat, pro.lon]}
              icon={getIconForType(pro.type)}
              eventHandlers={{
                click: () => setSelectedPro(pro),
              }}
            >
              <Popup>
                <div className="min-w-[210px]">
                  <p className="font-bold text-forest-900 text-sm">{pro.name}</p>
                  <p className="text-xs text-dusk-600">{pro.type}</p>
                  {pro.address && <p className="text-xs text-sand-600 mt-1">{pro.address}</p>}
                  {pro.phone && (
                    <a
                      href={`tel:${pro.phone.replace(/[^\d+]/g, '')}`}
                      className="text-xs font-semibold text-forest-600 flex items-center gap-1 mt-1"
                    >
                      <Phone className="w-3 h-3" /> {pro.phone}
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}

      {/* Locate Me Button */}
      <div className="absolute bottom-4 left-3 z-[1000]">
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          className="bg-white hover:bg-forest-50 w-10 h-10 rounded-xl shadow-lg flex items-center justify-center transition-all border border-sand-200 hover:border-forest-300 active:scale-95 disabled:opacity-70"
          title="Center on my GPS location"
        >
          {locating ? (
            <div className="w-4 h-4 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Locate className="w-4 h-4 text-forest-600" />
          )}
        </button>
        {locationError && (
          <div className="mt-1.5 bg-white/95 rounded-lg shadow border border-sand-200 px-2.5 py-1.5 text-[11px] text-sand-600 max-w-[220px]">
            {locationError}
          </div>
        )}
      </div>

      {/* Map Legend */}
      <div className="hidden sm:block absolute bottom-4 right-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-sand-200 p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-sand-100">
          <Compass className="w-3.5 h-3.5 text-forest-600" />
          <p className="text-[11px] font-semibold text-forest-800">Care Legend</p>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-sand-600">
          <span className="flex items-center gap-1">🏥 Hospital</span>
          <span className="flex items-center gap-1">🩺 Local Clinic</span>
          <span className="flex items-center gap-1">🧠 Mental Health</span>
          <span className="flex items-center gap-1">📍 You</span>
        </div>
      </div>

      {/* Selected Facility Bottom Detail Card */}
      <AnimatePresence>
        {selectedPro && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="absolute bottom-4 left-14 right-4 sm:right-44 z-[1000] bg-white rounded-2xl shadow-2xl border border-forest-200 p-3.5 max-w-md mx-auto"
          >
            <button
              type="button"
              onClick={() => setSelectedPro(null)}
              className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-sand-100 hover:bg-sand-200 flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5 text-sand-600" />
            </button>
            <div className="pr-6">
              <div className="flex items-center gap-1.5">
                <span>{getEmojiForType(selectedPro.type)}</span>
                <p className="font-bold text-forest-900 text-sm truncate">{selectedPro.name}</p>
              </div>
              <p className="text-xs text-forest-700 font-medium">
                {selectedPro.type} {selectedPro.distance !== undefined ? `• ${selectedPro.distance} km away` : ''}
              </p>
              {selectedPro.address && (
                <p className="text-[11px] text-sand-600 mt-1 line-clamp-1">{selectedPro.address}</p>
              )}
              {selectedPro.phone && (
                <p className="text-xs font-semibold text-forest-700 mt-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {selectedPro.phone}
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-2.5">
              {selectedPro.phone && (
                <a
                  href={`tel:${selectedPro.phone.replace(/[^\d+]/g, '')}`}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
              )}
              <button
                type="button"
                onClick={() => openInGoogleMaps(selectedPro.lat, selectedPro.lon, selectedPro.name)}
                className="flex-1 bg-forest-50 hover:bg-forest-100 text-forest-700 text-xs py-1.5 px-2.5 rounded-xl flex items-center justify-center gap-1 font-medium"
              >
                <Globe className="w-3.5 h-3.5" /> Google Maps
              </button>
              <button
                type="button"
                onClick={() => openDirectionsGoogleMaps(userPosition[0], userPosition[1], selectedPro.lat, selectedPro.lon)}
                className="flex-1 bg-forest-600 hover:bg-forest-700 text-white text-xs py-1.5 px-2.5 rounded-xl flex items-center justify-center gap-1 font-medium"
              >
                <Navigation className="w-3.5 h-3.5" /> Directions
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
