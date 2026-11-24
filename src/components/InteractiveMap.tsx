import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Phone, Layers, Locate, MapPin, Compass, X, Route, Globe, Clock } from 'lucide-react';
import { LocationData, Professional } from '../utils/types';
import { openInGoogleMaps, openDirectionsGoogleMaps } from '../services/location';

const createIcon = (color: string, emoji: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid white;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
    ">
      <span style="transform: rotate(45deg); font-size: 16px;">${emoji}</span>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

const userIcon = L.divIcon({
  className: 'user-marker',
  html: `<div style="
    width: 22px;
    height: 22px;
    background: linear-gradient(135deg, #3d8768, #2d6c53);
    border: 4px solid white;
    border-radius: 50%;
    box-shadow: 0 0 0 4px rgba(61,135,104,0.3), 0 4px 12px rgba(0,0,0,0.3);
    animation: userPulse 2s ease-in-out infinite;
  "></div>`,
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
  if (lower.includes('therapist') || lower.includes('psycholog')) return therapistIcon;
  return professionalIcon;
}

// Inner component — flies map to target. Uses string key to avoid re-flying on same coords
function FlyToHandler({ target }: { target: [number, number] | null }) {
  const map = useMap();
  const lastRef = useRef('');

  useEffect(() => {
    if (target) {
      const key = `${target[0].toFixed(5)},${target[1].toFixed(5)}`;
      if (key !== lastRef.current) {
        lastRef.current = key;
        map.flyTo(target, 15, { duration: 1.5 });
      }
    }
  }, [target, map]);

  return null;
}

interface InteractiveMapProps {
  location: LocationData | null;
  professionals: Professional[];
  onLocationUpdate: (loc: LocationData) => void;
}

type MapStyle = 'street' | 'satellite' | 'terrain';

const MAP_STYLES: Record<MapStyle, { url: string; attribution: string; name: string; icon: string }> = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
    name: 'Street',
    icon: '🗺️'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    name: 'Satellite',
    icon: '🛰️'
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap',
    name: 'Terrain',
    icon: '🏔️'
  }
};

export default function InteractiveMap({ location, professionals, onLocationUpdate }: InteractiveMapProps) {
  const [mapStyle, setMapStyle] = useState<MapStyle>('street');
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(
    location ? [location.lat, location.lon] : null
  );
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [locationError, setLocationError] = useState('');

  const defaultCenter: [number, number] = location
    ? [location.lat, location.lon]
    : [20.5937, 78.9629];

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const handleLocate = useCallback(() => {
    if (locating) return;

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
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

        // Reverse geocode
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=10&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'NeuralMinds/1.0',
            },
          }
        )
          .then((r) => r.json())
          .then((data) => {
            onLocationUpdate({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              city:
                data.address?.city ||
                data.address?.town ||
                data.address?.village ||
                data.address?.county,
              state: data.address?.state,
              country: data.address?.country,
              countryCode: data.address?.country_code?.toUpperCase(),
            });
          })
          .catch(() => {
            onLocationUpdate({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
            });
          });

        // Start live tracking
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }
        const id = navigator.geolocation.watchPosition(
          (p) => {
            setUserPosition([p.coords.latitude, p.coords.longitude]);
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
        setWatchId(id);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocationError('Location access denied. Please allow location in your browser settings.');
        } else if (err.code === 2) {
          setLocationError('Location unavailable. Please try again.');
        } else {
          setLocationError('Location request timed out. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [locating, watchId, onLocationUpdate]);



  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-sand-200 shadow-xl">
      {/* Inline styles for Leaflet overrides */}
      <style>{`
        @keyframes userPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(61,135,104,0.3), 0 4px 12px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 0 0 10px rgba(61,135,104,0.05), 0 4px 12px rgba(0,0,0,0.3); }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 16px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 12px 14px !important;
          font-family: 'Inter', system-ui, sans-serif !important;
        }
        .leaflet-popup-tip { box-shadow: none !important; }
        .custom-marker, .user-marker {
          background: none !important;
          border: none !important;
        }
      `}</style>

      {/* === THE MAP === */}
      <MapContainer
        center={defaultCenter}
        zoom={location ? 14 : 5}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          key={mapStyle}
          url={MAP_STYLES[mapStyle].url}
          attribution={MAP_STYLES[mapStyle].attribution}
        />

        <ZoomControl position="topright" />

        <FlyToHandler target={flyTarget} />

        {/* User marker */}
        {userPosition && (
          <>
            <Circle
              center={userPosition}
              radius={80}
              pathOptions={{
                color: '#3d8768',
                fillColor: '#3d8768',
                fillOpacity: 0.08,
                weight: 2,
                dashArray: '5, 5',
              }}
            />
            <Marker position={userPosition} icon={userIcon}>
              <Popup>
                <div className="text-center">
                  <p className="font-semibold text-forest-900">📍 You are here</p>
                  <p className="text-xs text-sand-500 mt-1">
                    {userPosition[0].toFixed(5)}, {userPosition[1].toFixed(5)}
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Professional markers */}
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
              <div className="min-w-[220px]">
                <p className="font-bold text-forest-900 text-base leading-tight">{pro.name}</p>
                <p className="text-sm text-dusk-600 mt-0.5">{pro.type}</p>
                {pro.address && (
                  <p className="text-xs text-sand-500 mt-2 flex items-start gap-1">
                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {pro.address}
                  </p>
                )}
                {pro.phone && (
                  <a href={`tel:${pro.phone.replace(/[^\d+]/g, '')}`} className="text-xs text-forest-600 flex items-center gap-1 mt-1 hover:underline">
                    <Phone className="w-3 h-3" /> {pro.phone}
                  </a>
                )}
                {pro.openingHours && (
                  <p className="text-xs text-sand-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {pro.openingHours}
                  </p>
                )}
                {pro.website && (
                  <a href={pro.website.startsWith('http') ? pro.website : `https://${pro.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-forest-600 flex items-center gap-1 mt-1 hover:underline">
                    <Globe className="w-3 h-3" /> Website
                  </a>
                )}
                {pro.description && (
                  <p className="text-[11px] text-sand-400 mt-1.5 leading-snug">{pro.description}</p>
                )}
                {pro.distance !== undefined && (
                  <p className="text-sm text-forest-600 font-semibold mt-2">📍 {pro.distance} km</p>
                )}
                <div className="flex gap-1.5 mt-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); openInGoogleMaps(pro.lat, pro.lon, pro.name); }}
                    className="flex-1 bg-white border border-forest-200 hover:bg-forest-50 text-forest-700 text-xs py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors font-medium"
                  >
                    <MapPin className="w-3 h-3" /> Maps
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (userPosition) {
                        openDirectionsGoogleMaps(userPosition[0], userPosition[1], pro.lat, pro.lon);
                      } else {
                        openInGoogleMaps(pro.lat, pro.lon, pro.name);
                      }
                    }}
                    className="flex-1 bg-forest-600 hover:bg-forest-700 text-white text-xs py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors font-medium"
                  >
                    <Route className="w-3 h-3" /> Directions
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* === ALL OVERLAYS OUTSIDE MapContainer so clicks work === */}

      {/* Locate button — bottom left */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <button
          onClick={handleLocate}
          disabled={locating}
          className="bg-white hover:bg-forest-50 w-12 h-12 rounded-xl shadow-lg flex items-center justify-center transition-all border border-sand-200 hover:border-forest-300 active:scale-95 disabled:opacity-70 cursor-pointer"
          title="Find my location"
        >
          {locating ? (
            <div className="w-5 h-5 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Locate className="w-5 h-5 text-forest-600" />
          )}
        </button>
        {locationError && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-14 left-0 bg-white rounded-xl shadow-lg border border-clay-200 px-3 py-2 w-56"
          >
            <p className="text-xs text-clay-600">{locationError}</p>
            <button
              onClick={() => setLocationError('')}
              className="text-xs text-sand-500 mt-1 hover:text-sand-700"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </div>

      {/* Map style switcher — top left */}
      <div className="absolute top-3 left-3 z-[1000]">
        <button
          onClick={() => setShowStyleMenu(!showStyleMenu)}
          className="bg-white hover:bg-sand-50 px-3 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all border border-sand-200 cursor-pointer"
        >
          <Layers className="w-4 h-4 text-forest-600" />
          <span className="text-sm font-medium text-forest-800">
            {MAP_STYLES[mapStyle].name}
          </span>
        </button>

        <AnimatePresence>
          {showStyleMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-14 left-0 bg-white rounded-xl shadow-xl border border-sand-200 overflow-hidden min-w-[140px]"
            >
              {(Object.keys(MAP_STYLES) as MapStyle[]).map((style) => (
                <button
                  key={style}
                  onClick={() => {
                    setMapStyle(style);
                    setShowStyleMenu(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center gap-3 cursor-pointer ${
                    mapStyle === style
                      ? 'bg-forest-50 text-forest-700 font-medium'
                      : 'text-forest-800 hover:bg-sand-50'
                  }`}
                >
                  <span className="text-lg">{MAP_STYLES[style].icon}</span>
                  {MAP_STYLES[style].name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Live status badge — top right (before zoom controls) */}
      <div className="absolute top-3 right-14 z-[1000]">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-sand-200 px-3 py-1.5 flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              userPosition ? 'bg-green-500 animate-pulse' : 'bg-sand-400'
            }`}
          />
          <span className="text-xs font-medium text-forest-800">
            {locating ? 'Locating...' : userPosition ? 'Live' : 'No location'}
          </span>
        </div>
      </div>

      {/* Legend — bottom right */}
      <div className="absolute bottom-4 right-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-sand-200 p-3">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-sand-100">
          <Compass className="w-4 h-4 text-forest-600" />
          <p className="text-xs font-semibold text-forest-800">Legend</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-forest-500 to-forest-700 border-2 border-white shadow" />
            <span className="text-[11px] text-sand-600">You</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm leading-none">🏥</span>
            <span className="text-[11px] text-sand-600">Professional</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm leading-none">🏨</span>
            <span className="text-[11px] text-sand-600">Hospital</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm leading-none">🧠</span>
            <span className="text-[11px] text-sand-600">Therapist</span>
          </div>
        </div>
      </div>

      {/* Selected professional detail card — bottom center */}
      <AnimatePresence>
        {selectedPro && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-16 right-24 z-[1000] bg-white rounded-2xl shadow-2xl border border-sand-200 p-4 max-w-sm mx-auto"
          >
            <button
              onClick={() => setSelectedPro(null)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-sand-100 hover:bg-sand-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-sand-600" />
            </button>
            <div className="pr-8">
              <p className="font-bold text-forest-900 text-lg leading-tight">{selectedPro.name}</p>
              <p className="text-sm text-dusk-600">{selectedPro.type}</p>
              {selectedPro.address && (
                <p className="text-xs text-sand-500 mt-1">{selectedPro.address}</p>
              )}
              {selectedPro.openingHours && (
                <p className="text-xs text-sand-500 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{selectedPro.openingHours}</p>
              )}
              {selectedPro.description && (
                <p className="text-[11px] text-sand-400 mt-1">{selectedPro.description}</p>
              )}
              {selectedPro.distance !== undefined && (
                <p className="text-sm text-forest-600 font-semibold mt-1">📍 {selectedPro.distance} km away</p>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              {selectedPro.phone && (
                <a
                  href={`tel:${selectedPro.phone.replace(/[^\d+]/g, '')}`}
                  className="w-10 flex items-center justify-center bg-warm-50 hover:bg-warm-100 text-warm-600 rounded-xl transition-colors"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
              <button
                onClick={() => openInGoogleMaps(selectedPro.lat, selectedPro.lon, selectedPro.name)}
                className="flex-1 bg-forest-50 hover:bg-forest-100 text-forest-700 text-sm py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors font-medium cursor-pointer"
              >
                <MapPin className="w-4 h-4" /> Open in Maps
              </button>
              <button
                onClick={() => {
                  if (userPosition) {
                    openDirectionsGoogleMaps(userPosition[0], userPosition[1], selectedPro.lat, selectedPro.lon);
                  } else {
                    openInGoogleMaps(selectedPro.lat, selectedPro.lon, selectedPro.name);
                  }
                }}
                className="flex-1 bg-forest-600 hover:bg-forest-700 text-white text-sm py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors font-medium cursor-pointer"
              >
                <Navigation className="w-4 h-4" /> Directions
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
