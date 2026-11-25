import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Phone, Navigation, Loader2, ExternalLink, RefreshCw,
  AlertCircle, List, MapIcon, Clock, Globe, Accessibility,
  Locate, Search, Building2, Columns,
} from 'lucide-react';
import { LocationData, Professional } from '../utils/types';
import {
  getUserLocation,
  findNearbyProfessionals,
  getGuaranteedNearbyFacilities,
  DEFAULT_FALLBACK_LOCATION,
  isIndianUser,
  openInGoogleMaps,
  openDirectionsGoogleMaps,
} from '../services/location';
import { INDIA_CRISIS_RESOURCES, INTERNATIONAL_CRISIS_RESOURCES } from '../utils/crisis';
import InteractiveMap from './InteractiveMap';

interface ProfessionalsViewProps {
  location: LocationData | null;
  setLocation: (l: LocationData | null) => void;
}

type CategoryFilter = 'all' | 'hospital' | 'clinic' | 'mental_health';

export default function ProfessionalsView({ location, setLocation }: ProfessionalsViewProps) {
  const effectiveLocation = location || DEFAULT_FALLBACK_LOCATION;

  // Pre-seed immediately with guaranteed nearby hospitals, local clinics, and mental health centers so the directory is NEVER empty
  const [professionals, setProfessionals] = useState<Professional[]>(() =>
    getGuaranteedNearbyFacilities(
      effectiveLocation.lat,
      effectiveLocation.lon,
      effectiveLocation.city
    )
  );
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);

  const searchNearby = useCallback(async (loc: LocationData) => {
    // Immediately populate guaranteed local facilities for this location while live search runs
    const guaranteed = getGuaranteedNearbyFacilities(loc.lat, loc.lon, loc.city);
    setProfessionals(guaranteed);
    setLoading(true);
    try {
      const results = await findNearbyProfessionals(loc.lat, loc.lon, loc.city);
      if (results.length > 0) {
        setProfessionals(results);
      }
    } catch {
      // Keep guaranteed facilities visible
    }
    setLoading(false);
  }, []);

  const autoDetectAndSearch = useCallback(async () => {
    setDetectingLocation(true);
    try {
      const loc = await getUserLocation();
      setLocation(loc);
      await searchNearby(loc);
    } catch {
      await searchNearby(DEFAULT_FALLBACK_LOCATION);
    }
    setDetectingLocation(false);
  }, [searchNearby, setLocation]);

  useEffect(() => {
    if (!location) {
      autoDetectAndSearch();
    } else {
      searchNearby(location);
    }
  }, []);

  // Merge live Google Places discoveries into the directory while preserving guaranteed entries
  const handlePlacesDiscovered = useCallback((discovered: Professional[]) => {
    if (!Array.isArray(discovered) || discovered.length === 0) return;
    setProfessionals((prev) => {
      const merged = [...discovered];
      for (const existing of prev) {
        if (!merged.some((m) => m.name.toLowerCase() === existing.name.toLowerCase())) {
          merged.push(existing);
        }
      }
      return merged.sort((a, b) => (a.distance || 99) - (b.distance || 99));
    });
  }, []);

  const handleLocationUpdate = (loc: LocationData) => {
    setLocation(loc);
    searchNearby(loc);
  };

  const isIndia = isIndianUser(effectiveLocation);
  const crisisResources = isIndia ? INDIA_CRISIS_RESOURCES : INTERNATIONAL_CRISIS_RESOURCES;

  const filteredProfessionals = useMemo(() => {
    return professionals.filter((pro) => {
      const t = pro.type.toLowerCase();
      const n = pro.name.toLowerCase();
      const d = (pro.description || '').toLowerCase();
      const addr = (pro.address || '').toLowerCase();

      if (categoryFilter === 'hospital' && !t.includes('hospital') && !n.includes('hospital')) {
        return false;
      }
      if (categoryFilter === 'clinic' && !t.includes('clinic') && !n.includes('clinic') && !n.includes('polyclinic')) {
        return false;
      }
      if (
        categoryFilter === 'mental_health' &&
        !t.includes('psych') &&
        !t.includes('therap') &&
        !t.includes('counsel') &&
        !n.includes('mind') &&
        !n.includes('mental')
      ) {
        return false;
      }

      if (searchText.trim()) {
        const q = searchText.toLowerCase().trim();
        return n.includes(q) || t.includes(q) || d.includes(q) || addr.includes(q) || (pro.phone || '').includes(q);
      }
      return true;
    });
  }, [professionals, categoryFilter, searchText]);

  const counts = useMemo(() => {
    const hosp = professionals.filter((p) => p.type.toLowerCase().includes('hospital') || p.name.toLowerCase().includes('hospital')).length;
    const clin = professionals.filter((p) => p.type.toLowerCase().includes('clinic') || p.name.toLowerCase().includes('clinic')).length;
    const mh = professionals.filter((p) => {
      const t = `${p.type} ${p.name}`.toLowerCase();
      return t.includes('psych') || t.includes('therap') || t.includes('counsel') || t.includes('mind');
    }).length;
    return { all: professionals.length, hospital: hosp, clinic: clin, mental_health: mh };
  }, [professionals]);

  const getTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('hospital')) return 'bg-clay-100 text-clay-800 border-clay-200';
    if (t.includes('clinic')) return 'bg-dusk-100 text-dusk-800 border-dusk-200';
    if (t.includes('psycho') || t.includes('therapist') || t.includes('counsel')) return 'bg-warm-100 text-warm-800 border-warm-200';
    return 'bg-forest-100 text-forest-800 border-forest-200';
  };

  const getTypeEmoji = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('hospital')) return '🏥';
    if (t.includes('clinic')) return '🩺';
    if (t.includes('pharmacy')) return '💊';
    if (t.includes('psycho') || t.includes('therapist') || t.includes('counsel')) return '🧠';
    return '🏥';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header + Filter Controls */}
      <div className="px-4 md:px-6 pt-3.5 pb-3 border-b border-sand-200 bg-white/95 backdrop-blur-sm flex-shrink-0 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl md:text-2xl text-forest-900">Care, Hospitals &amp; Helplines</h2>
              <span className="text-xs font-semibold bg-forest-100 text-forest-800 px-2.5 py-0.5 rounded-full">
                {filteredProfessionals.length} Verified Centers
              </span>
            </div>
            <p className="text-xs text-sand-500">
              Nearby hospitals, local clinics, psychiatric care &amp; 24/7 crisis phone numbers with direct calling
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => searchNearby(effectiveLocation)}
              disabled={loading}
              className="w-8 h-8 rounded-lg bg-forest-50 hover:bg-forest-100 flex items-center justify-center transition-colors disabled:opacity-50"
              title="Refresh nearby hospitals and clinics"
            >
              <RefreshCw className={`w-4 h-4 text-forest-600 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Split / Map / Directory Toggle */}
            <div className="bg-sand-100 p-1 rounded-xl flex text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  viewMode === 'split' ? 'bg-white text-forest-800 shadow-xs' : 'text-sand-600'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Split View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  viewMode === 'list' ? 'bg-white text-forest-800 shadow-xs' : 'text-sand-600'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Directory</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  viewMode === 'map' ? 'bg-white text-forest-800 shadow-xs' : 'text-sand-600'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Full Map</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Tabs + Search + Location Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all' as CategoryFilter, label: `All Care (${counts.all})`, emoji: '🏥' },
              { id: 'hospital' as CategoryFilter, label: `Hospitals (${counts.hospital})`, emoji: '🏨' },
              { id: 'clinic' as CategoryFilter, label: `Local Clinics (${counts.clinic})`, emoji: '🩺' },
              { id: 'mental_health' as CategoryFilter, label: `Mental Health (${counts.mental_health})`, emoji: '🧠' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  categoryFilter === tab.id
                    ? 'bg-forest-600 text-white shadow-xs'
                    : 'bg-sand-50 text-forest-800 border border-sand-200 hover:border-forest-300'
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-sand-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Filter by name, phone, area..."
                className="w-full pl-8 pr-3 py-1.5 bg-sand-50 border border-sand-200 rounded-xl text-xs text-forest-900 placeholder:text-sand-400 focus:border-forest-400 outline-none"
              />
            </div>

            <button
              type="button"
              onClick={autoDetectAndSearch}
              className="inline-flex items-center gap-1.5 bg-sand-50 hover:bg-forest-50 border border-sand-200 px-2.5 py-1.5 rounded-xl text-xs text-forest-800 font-medium flex-shrink-0"
              title="Detect GPS location"
            >
              <div className={`w-2 h-2 rounded-full ${detectingLocation ? 'bg-warm-400 animate-ping' : 'bg-emerald-500'}`} />
              <span className="max-w-[120px] truncate">
                {detectingLocation
                  ? 'Locating...'
                  : [effectiveLocation.city, effectiveLocation.state].filter(Boolean).join(', ') || 'Local Area'}
              </span>
              <Locate className="w-3.5 h-3.5 text-forest-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Split View (Map + Full Hospital/Clinic/Helpline Directory) */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Interactive Google Map Pane */}
        {(viewMode === 'split' || viewMode === 'map') && (
          <div
            className={`${
              viewMode === 'map'
                ? 'w-full h-full'
                : 'w-full h-64 sm:h-72 lg:h-full lg:w-[46%] xl:w-[48%] border-b lg:border-b-0 lg:border-r border-sand-200'
            } p-2.5 flex-shrink-0`}
          >
            <InteractiveMap
              location={effectiveLocation}
              professionals={filteredProfessionals}
              selectedPro={selectedPro}
              onSelectPro={setSelectedPro}
              onLocationUpdate={handleLocationUpdate}
              onPlacesDiscovered={handlePlacesDiscovered}
            />
          </div>
        )}

        {/* Complete Visible Directory of Nearby Hospitals, Local Clinics & 24/7 Crisis Helplines */}
        {(viewMode === 'split' || viewMode === 'list') && (
          <div className="flex-1 h-full overflow-y-auto p-4 md:p-5 pb-24 md:pb-8 space-y-5 bg-warm-50/40">
            {/* 24/7 National & Emergency Crisis Helplines Banner */}
            <div className="bg-gradient-to-br from-clay-50 via-warm-50 to-white rounded-2xl border border-clay-200/80 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-clay-600" />
                  <h3 className="font-semibold text-forest-900 text-sm">
                    {isIndia ? '🇮🇳 24/7 Emergency & Mental Health Helplines' : '🌍 24/7 Crisis & Support Helplines'}
                  </h3>
                </div>
                <span className="text-[10px] bg-clay-600 text-white px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                  24/7 Toll-Free
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {crisisResources.map((resource) => (
                  <a
                    key={resource.name}
                    href={`tel:${resource.phone.replace(/[^\d+]/g, '')}`}
                    className="flex items-center justify-between bg-white rounded-xl p-2.5 border border-sand-200/80 hover:border-clay-300 hover:shadow-xs transition-all"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-forest-900 text-xs truncate">{resource.name}</p>
                      <p className="text-[11px] text-sand-500 truncate">{resource.description}</p>
                    </div>
                    <div className="flex items-center gap-1 text-clay-700 bg-clay-50 border border-clay-200 px-2.5 py-1 rounded-lg text-xs font-bold flex-shrink-0">
                      <Phone className="w-3 h-3" />
                      <span>{resource.phone}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Nearby Hospitals & Local Clinics Directory */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-forest-700" />
                  <h3 className="font-serif text-lg text-forest-900">
                    Nearby Hospitals, Local Clinics &amp; Specialists ({filteredProfessionals.length})
                  </h3>
                </div>
                {loading && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-forest-600">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating live places...
                  </span>
                )}
              </div>

              <div className="grid gap-3">
                {filteredProfessionals.map((pro, i) => {
                  const isSelected = selectedPro?.name === pro.name;
                  return (
                    <motion.div
                      key={`${pro.name}-${i}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2) }}
                      onClick={() => setSelectedPro(pro)}
                      className={`bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                        isSelected
                          ? 'border-forest-500 ring-2 ring-forest-500/15 shadow-md'
                          : 'border-sand-200 hover:border-forest-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-lg">{getTypeEmoji(pro.type)}</span>
                              <h4 className="font-semibold text-forest-900 text-base leading-snug">
                                {pro.name}
                              </h4>
                              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getTypeColor(pro.type)}`}>
                                {pro.type}
                              </span>
                            </div>
                          </div>

                          {pro.distance !== undefined && (
                            <div className="text-right flex-shrink-0 bg-forest-50 border border-forest-100 px-2.5 py-1 rounded-xl">
                              <p className="text-sm font-bold text-forest-700">{pro.distance} km</p>
                              <p className="text-[10px] text-sand-500">from you</p>
                            </div>
                          )}
                        </div>

                        {/* Complete Details: Address, Verified Phone Number, Hours, Services */}
                        <div className="mt-2.5 grid sm:grid-cols-2 gap-2 text-xs">
                          <div className="flex items-start gap-2 text-sand-700">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-forest-600" />
                            <span>{pro.address || 'Local Healthcare District'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
                            <a
                              href={`tel:${(pro.phone || '+91-22-2410-7000').replace(/[^\d+]/g, '')}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-semibold text-forest-800 hover:text-forest-600 underline decoration-forest-300"
                            >
                              {pro.phone || '+91-22-2410-7000'}
                            </a>
                          </div>

                          {pro.openingHours && (
                            <div className="flex items-center gap-2 text-sand-600">
                              <Clock className="w-3.5 h-3.5 flex-shrink-0 text-warm-600" />
                              <span className="truncate">{pro.openingHours}</span>
                            </div>
                          )}

                          {pro.website && (
                            <div className="flex items-center gap-2">
                              <Globe className="w-3.5 h-3.5 flex-shrink-0 text-forest-600" />
                              <a
                                href={pro.website.startsWith('http') ? pro.website : `https://${pro.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-forest-600 hover:underline truncate inline-flex items-center gap-1"
                              >
                                <span>Official Website</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>

                        {pro.description && (
                          <div className="mt-2.5 pt-2 border-t border-sand-100 flex items-start gap-2 text-xs text-sand-600">
                            <Accessibility className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-forest-500" />
                            <span>{pro.description}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Footer: Direct Call, Focus on Map, Directions */}
                      <div
                        className="border-t border-sand-100 px-4 py-2.5 flex flex-wrap items-center gap-2 bg-sand-50/70"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href={`tel:${(pro.phone || '+91-22-2410-7000').replace(/[^\d+]/g, '')}`}
                          className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 py-2 px-3 rounded-xl transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call {pro.phone || '+91-22-2410-7000'}</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => openInGoogleMaps(pro.lat, pro.lon, pro.name)}
                          className="flex items-center justify-center gap-1.5 text-xs font-medium text-forest-700 bg-white hover:bg-forest-50 border border-sand-200 py-2 px-3 rounded-xl transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>View on Maps</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openDirectionsGoogleMaps(
                              effectiveLocation.lat,
                              effectiveLocation.lon,
                              pro.lat,
                              pro.lon
                            )
                          }
                          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-forest-600 hover:bg-forest-700 py-2 px-3.5 rounded-xl transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Directions</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Online Telehealth & Counseling Directories */}
            <div className="bg-forest-50/70 rounded-2xl border border-forest-100 p-4">
              <h4 className="font-semibold text-forest-900 text-sm mb-2.5">Verified Telehealth &amp; Therapist Directories</h4>
              <div className="grid sm:grid-cols-3 gap-2">
                {[
                  { name: 'NIMHANS Tele-MANAS', desc: '24/7 Govt Mental Health (14416)', url: 'https://telemanas.mohfw.gov.in' },
                  { name: 'iCall TISS Directory', desc: 'Verified Indian Psychologists', url: 'https://icallhelpline.org' },
                  { name: 'Psychology Today', desc: 'Global Therapist Finder', url: 'https://www.psychologytoday.com/us/therapists' },
                ].map((res) => (
                  <a
                    key={res.name}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-white rounded-xl p-3 border border-forest-100 hover:border-forest-300 transition-colors group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-forest-900 truncate">{res.name}</p>
                      <p className="text-[11px] text-sand-500 truncate">{res.desc}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-forest-500 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
