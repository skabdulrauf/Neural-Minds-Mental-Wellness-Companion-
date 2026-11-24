import { motion } from 'framer-motion';
import { Phone, Heart, X, MessageCircle } from 'lucide-react';
import { LocationData } from '../utils/types';
import { INDIA_CRISIS_RESOURCES, INTERNATIONAL_CRISIS_RESOURCES } from '../utils/crisis';
import { isIndianUser } from '../services/location';

interface CrisisModalProps {
  onClose: () => void;
  location: LocationData | null;
}

// Check if the phone string is a text-based instruction vs actual number
function isTextBased(phone: string): boolean {
  return phone.toLowerCase().includes('text') || 
         phone.includes('.org') || 
         phone.includes('.com') ||
         !(/\d/.test(phone));
}

export default function CrisisModal({ onClose, location }: CrisisModalProps) {
  const isIndia = isIndianUser(location);
  const resources = isIndia ? INDIA_CRISIS_RESOURCES : INTERNATIONAL_CRISIS_RESOURCES;
  const additionalResources = isIndia ? INTERNATIONAL_CRISIS_RESOURCES : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-forest-950/60 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="bg-gradient-to-br from-clay-500 to-clay-700 p-8 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 animate-gentlePulse">
            <Heart className="w-8 h-8 text-white" fill="white" />
          </div>
          <h2 className="font-serif text-2xl text-white mb-2">You matter. You are not alone.</h2>
          <p className="text-clay-100 leading-relaxed">
            What you're feeling right now is incredibly difficult, and it takes courage to express it.
            Please reach out to someone who can help — right now.
          </p>
        </div>

        <div className="p-8 space-y-4">
          <p className="text-sm font-medium text-forest-800 mb-4">
            {isIndia ? '🇮🇳 India Crisis Helplines — Available now' : '🌍 Crisis Resources — Available now'}
          </p>

          {resources.map((resource, i) => {
            const textBased = isTextBased(resource.phone);
            
            return textBased ? (
              <motion.div
                key={resource.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-forest-50 rounded-2xl p-4 border border-forest-100"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-forest-900">{resource.name}</p>
                    <p className="text-sm text-sand-600 mt-0.5">{resource.description}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-forest-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {resource.phone}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.a
                key={resource.name}
                href={`tel:${resource.phone.replace(/[^\d+]/g, '')}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="block bg-forest-50 hover:bg-forest-100 rounded-2xl p-4 transition-all duration-300 group border border-forest-100 hover:border-forest-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-forest-900 group-hover:text-forest-700">{resource.name}</p>
                    <p className="text-sm text-sand-600 mt-0.5">{resource.description}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-forest-600 text-white px-4 py-2 rounded-xl text-sm font-medium group-hover:bg-forest-700 transition-colors">
                    <Phone className="w-3.5 h-3.5" />
                    {resource.phone}
                  </div>
                </div>
              </motion.a>
            );
          })}

          {additionalResources.length > 0 && (
            <>
              <p className="text-sm font-medium text-sand-600 mt-6 mb-3">International Resources</p>
              {additionalResources.map((resource) => {
                const textBased = isTextBased(resource.phone);
                
                return (
                  <div key={resource.name} className="bg-sand-50 rounded-xl p-3 border border-sand-100">
                    <p className="font-medium text-forest-800 text-sm">{resource.name}</p>
                    <p className="text-xs text-sand-600">
                      {textBased ? (
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {resource.phone}
                        </span>
                      ) : (
                        <a href={`tel:${resource.phone.replace(/[^\d+]/g, '')}`} className="text-forest-600 hover:underline">
                          {resource.phone}
                        </a>
                      )}
                      {' — '}{resource.description}
                    </p>
                  </div>
                );
              })}
            </>
          )}

          <div className="mt-6 pt-4 border-t border-sand-100">
            <p className="text-sm text-sand-600 text-center leading-relaxed">
              If you're in immediate danger, please call your local emergency number.
              <br />
              <span className="font-medium text-forest-700">You deserve help and you deserve to be here.</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-4 bg-sand-100 hover:bg-sand-200 text-sand-700 py-3 rounded-2xl text-sm font-medium transition-all duration-300"
          >
            I understand — return to chat
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
