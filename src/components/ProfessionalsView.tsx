import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Phone, Navigation, Loader2, ExternalLink, RefreshCw,
  AlertCircle, List, MapIcon, Clock, Globe, Accessibility,
  Locate, Search,
} from 'lucide-react';
import { LocationData, Professional } from '../utils/types';
import {
  getUserLocation, findNearbyProfessionals, isIndianUser,
  openInGoogleMaps, openDirectionsGoogleMaps,
} from '../services/location';
import { INDIA_CRISIS_RESOURCES, INTERNATIONAL_CRISIS_RESOURCES } from '../utils/crisis';
import InteractiveMap from './InteractiveMap';

interface ProfessionalsViewProps {
  location: LocationData | null;
  setLocation: (l: LocationData | null) => void;
}

export default function ProfessionalsView({ location, setLocation }: ProfessionalsViewProps) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [detectingLocation, setDetectingLocation] = useState(false);

  const searchNearby = useCallback(async (loc: LocationData) => {
    setLoading(true);
    setError('');
    try {
      const results = await findNearbyProfessionals(loc.lat, loc.lon);
      setProfessionals(results);
      setSearched(true);
      if (results.length === 0) {
        setError('No hospitals or clinics found nearby in map data. Try increasing the search area.');
      }
    } catch {
      setError('Search temporarily unavailable. Please try again.');
    }
    setLoading(false);
  }, []);

  const autoDetectAndSearch = useCallback(async () => {
    setDetectingLocation(true);
    setError('');
    try {
      const loc = await getUserLocation();
      setLocation(loc);
      await searchNearby(loc);
    } catch {
      setError('Please allow location access to find hospitals near you.');
    }
    setDetectingLocation(false);
  }, [searchNearby, setLocation]);

  // Auto-detect on mount
  useEffect(() => {
    if (!location) {
      autoDetectAndSearch();
    } else if (!searched) {
      searchNearby(location);
    }
  }, []);

  const refreshResults = async () => {
    if (location) {
      await searchNearby(location);
    } else {
      await autoDetectAndSearch();
    }
  };

  const handleLocationUpdate = (loc: LocationData) => {
    setLocation(loc);
    searchNearby(loc);
  };

  const isIndia = isIndianUser(location);
  const crisisResources = isIndia ? INDIA_CRISIS_RESOURCES : INTERNATIONAL_CRISIS_RESOURCES;

  const getTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('hospital')) return 'bg-clay-100 text-clay-700';
    if (t.includes('clinic')) return 'bg-dusk-100 text-dusk-700';
    if (t.includes('pharmacy')) return 'bg-forest-100 text-forest-700';
    if (t.includes('psycho') || t.includes('therapist') || t.includes('counsel')) return 'bg-warm-100 text-warm-700';
    return 'bg-sand-100 text-sand-700';
  };

  const getTypeEmoji = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('hospital')) return '🏥';
    if (t.includes('clinic')) return '🩺';
    if (t.includes('pharmacy')) return '💊';
    if (t.includes('psycho')) return '🧠';
    if (t.includes('therapist') || t.includes('counsel')) return '🧠';
    if (t.includes('doctor')) return '👨‍⚕️';
    return '🏥';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-8 pt-4 pb-3 border-b border-sand-200 bg-white/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-serif text-2xl text-forest-900">Find Support</h2>
            <p className="text-sm text-sand-500">
              {loading || detectingLocation
                ? 'Searching nearby...'
                : professionals.length > 0
                  ? `${professionals.length} places found`
                  : 'Hospitals, clinics & professionals near you'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <button
              onClick={refreshResults}
              disabled={loading}
              className="w-9 h-9 rounded-lg bg-forest-50 hover:bg-forest-100 flex items-center justify-center transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-forest-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {/* Map / List toggle */}
            <div className="bg-sand-100 p-1 rounded-xl flex">
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'map' ? 'bg-white text-forest-700 shadow-sm' : 'text-sand-600'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                Map
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'list' ? 'bg-white text-forest-700 shadow-sm' : 'text-sand-600'
                }`}
              >
                <List className="w-4 h-4" />
                List
              </button>
            </div>
          </div>
        </div>

        {/* Location status */}
        <div className="flex items-center justify-between bg-sand-50 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${location ? 'bg-green-500 animate-pulse' : detectingLocation ? 'bg-warm-400 animate-pulse' : 'bg-sand-400'}`} />
            <span className="text-sm text-forest-800 truncate">
              {detectingLocation
                ? 'Detecting your location...'
                : location
                  ? [location.city, location.state].filter(Boolean).join(', ') || `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`
                  : 'Location not available'}
            </span>
          </div>
          {!detectingLocation && !location && (
            <button
              onClick={autoDetectAndSearch}
              className="text-sm text-forest-600 hover:text-forest-700 font-medium flex items-center gap-1 flex-shrink-0"
            >
              <Locate className="w-4 h-4" />
              Detect
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {(loading || detectingLocation) && professionals.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-forest-500 animate-spin mx-auto mb-3" />
            <p className="text-sand-600 font-medium">
              {detectingLocation ? 'Finding your location...' : 'Searching for nearby hospitals...'}
            </p>
            <p className="text-xs text-sand-400 mt-1">This may take a few seconds</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && !detectingLocation && professionals.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-warm-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-warm-400" />
            </div>
            <p className="text-forest-900 font-medium mb-2">{error}</p>
            <button
              onClick={autoDetectAndSearch}
              className="mt-3 bg-forest-600 hover:bg-forest-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {(professionals.length > 0 || (searched && !loading)) && (
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {viewMode === 'map' ? (
              <motion.div
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full p-3"
              >
                <InteractiveMap
                  location={location}
                  professionals={professionals}
                  onLocationUpdate={handleLocationUpdate}
                />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-4"
              >
                {/* Crisis resources */}
                <div className="bg-gradient-to-br from-clay-50 to-warm-50 rounded-2xl border border-clay-100 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-clay-500" />
                    <h3 className="font-medium text-forest-900 text-sm">
                      {isIndia ? '🇮🇳 Crisis Helplines' : '🌍 Crisis Helplines'}
                    </h3>
                    <span className="ml-auto text-[10px] bg-clay-200 text-clay-700 px-2 py-0.5 rounded-full font-medium">24/7</span>
                  </div>
                  <div className="grid gap-1.5">
                    {crisisResources.map((resource) => (
                      <a
                        key={resource.name}
                        href={`tel:${resource.phone.replace(/[^\d+]/g, '')}`}
                        className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-sand-100 hover:border-forest-200 transition-all group"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-forest-900 text-sm truncate">{resource.name}</p>
                          <p className="text-[11px] text-sand-500 truncate">{resource.description}</p>
                        </div>
                        <div className="flex items-center gap-1 text-forest-600 bg-forest-50 px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0 ml-2">
                          <Phone className="w-3 h-3" />
                          {resource.phone}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Professional cards */}
                {professionals.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-lg text-forest-900">
                        Nearby ({professionals.length})
                      </h3>
                      {loading && <Loader2 className="w-4 h-4 text-forest-500 animate-spin" />}
                    </div>

                    {professionals.map((pro, i) => (
                      <motion.div
                        key={`${pro.name}-${i}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="bg-white rounded-xl border border-sand-200 overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {/* Card header */}
                        <div className="p-4 pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{getTypeEmoji(pro.type)}</span>
                                <h4 className="font-semibold text-forest-900 text-base truncate">{pro.name}</h4>
                              </div>
                              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${getTypeColor(pro.type)}`}>
                                {pro.type}
                              </span>
                            </div>
                            {pro.distance !== undefined && (
                              <div className="text-right flex-shrink-0">
                                <p className="text-lg font-bold text-forest-600">{pro.distance}</p>
                                <p className="text-[10px] text-sand-500 -mt-0.5">km</p>
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="mt-3 space-y-1.5">
                            {pro.address && (
                              <div className="flex items-start gap-2 text-sm text-sand-600">
                                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-sand-400" />
                                <span>{pro.address}</span>
                              </div>
                            )}
                            {pro.phone && (
                              <a href={`tel:${pro.phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-2 text-sm text-forest-600 hover:text-forest-700">
                                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{pro.phone}</span>
                              </a>
                            )}
                            {pro.website && (
                              <a href={pro.website.startsWith('http') ? pro.website : `https://${pro.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-forest-600 hover:text-forest-700">
                                <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">Website</span>
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              </a>
                            )}
                            {pro.openingHours && (
                              <div className="flex items-center gap-2 text-sm text-sand-600">
                                <Clock className="w-3.5 h-3.5 flex-shrink-0 text-sand-400" />
                                <span className="truncate">{pro.openingHours}</span>
                              </div>
                            )}
                            {pro.description && (
                              <div className="flex items-start gap-2 text-sm text-sand-500">
                                <Accessibility className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-sand-400" />
                                <span>{pro.description}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="border-t border-sand-100 px-4 py-2.5 flex items-center gap-2 bg-sand-50/50">
                          <button
                            onClick={() => openInGoogleMaps(pro.lat, pro.lon, pro.name)}
                            className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-forest-700 bg-forest-50 hover:bg-forest-100 py-2 px-3 rounded-lg transition-colors"
                          >
                            <MapPin className="w-4 h-4" />
                            Open in Maps
                          </button>
                          {location && (
                            <button
                              onClick={() => openDirectionsGoogleMaps(location.lat, location.lon, pro.lat, pro.lon)}
                              className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-forest-600 hover:bg-forest-700 py-2 px-3 rounded-lg transition-colors"
                            >
                              <Navigation className="w-4 h-4" />
                              Directions
                            </button>
                          )}
                          {pro.phone && (
                            <a
                              href={`tel:${pro.phone.replace(/[^\d+]/g, '')}`}
                              className="w-10 h-9 flex items-center justify-center bg-warm-50 hover:bg-warm-100 text-warm-600 rounded-lg transition-colors"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Online resources */}
                <div className="bg-forest-50 rounded-2xl border border-forest-100 p-4">
                  <h4 className="font-medium text-forest-900 mb-3">Online Resources</h4>
                  <div className="grid gap-2">
                    {[
                      { name: 'Psychology Today', desc: 'Find therapists', url: 'https://www.psychologytoday.com/us/therapists' },
                      { name: 'BetterHelp', desc: 'Online therapy', url: 'https://www.betterhelp.com' },
                      { name: '7 Cups', desc: 'Free support chat', url: 'https://www.7cups.com' },
                    ].map((res) => (
                      <a
                        key={res.name}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between bg-white rounded-lg p-3 border border-forest-100 hover:border-forest-200 transition-colors group"
                      >
                        <div>
                          <p className="text-sm font-medium text-forest-800">{res.name}</p>
                          <p className="text-xs text-sand-500">{res.desc}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-forest-400 group-hover:text-forest-600" />
                      </a>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
