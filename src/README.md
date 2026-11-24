# NeuralMinds — AI Mental Health Support Companion

## Overview
NeuralMinds is a beautiful, thoughtful AI-powered mental health support chatbot. It provides a safe, non-judgmental space for users to express their feelings and receive compassionate, personalized support.

## Features

### 💬 Intelligent Chat System
- Powered by Groq AI (LLaMA 3 8B)
- Emotion detection on every message
- Risk classification (low/moderate/high/critical)
- Hardcoded crisis keyword detection before every API call
- PHQ-9 screening after 5 distressed messages
- Age/gender inference from conversation (never asks directly)
- Personalized responses per age group
- Menstrual phase awareness for female users
- One question per message rule
- Validates feelings before any advice

### 🔐 Authentication
- Email/password signup with email verification
- Google OAuth with popup and redirect fallback
- Guest mode available
- Firebase Firestore for data persistence

### 📍 Location Services
- Browser geolocation
- Reverse geocoding via OpenStreetMap Nominatim
- Nearby mental health professionals via Overpass API
- India-specific crisis helplines for Indian users
- International crisis resources

### 📊 Dashboard
- Mood timeline (Chart.js)
- Emotion frequency donut chart
- PHQ-9 history tracking
- Streak tracker

### 🧘 Wellness Tools
- **Breathing Exercise**: 4-7-8, Box Breathing, Simple Calm
- **5-4-3-2-1 Grounding**: Interactive sensory grounding exercise
- **Journal**: AI-generated prompts, save and review entries

### 🚨 Crisis System
Keyword detection for: "kill myself, end my life, want to die, suicide, hurt myself, self harm, cut myself, no reason to live, don't want to exist, better off dead, overdose, end it all, take my life, goodbye forever"

On match:
- Full-screen crisis modal with helpline numbers
- Skip AI API call
- Log to Firestore

**India Helplines**: iCall (9152987821), Vandrevala (1860-2662-345), AASRA (9820466627), NIMHANS (080-46110007)

### 🔒 Security
- HTML sanitization on all user input
- XSS prevention
- API keys stored in localStorage only
- No keys ever in source code

## Setup

**Zero configuration required to start!** On first launch, you'll see a beautiful onboarding experience:

1. **Welcome Screen**: Introduces NeuralMinds and its features
2. **AI Connection (60 seconds)**: Opens Groq Console where you get a free API key — no credit card needed. Paste it, test connection, done!
3. **Save Progress (Optional)**: Connect Firebase to save your journey across devices, or skip and use guest mode

The onboarding feels like setting up a new iPhone — premium, warm, and guided. You only do it once.

## Tech Stack
- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4
- Framer Motion
- Chart.js
- Firebase Auth & Firestore
- Groq AI API
- OpenStreetMap APIs

## Architecture
```
src/
├── App.tsx              # Main app with navigation
├── components/
│   ├── OnboardingWizard.tsx  # API key setup
│   ├── AuthScreen.tsx        # Login/signup
│   ├── ChatView.tsx          # Main chat interface
│   ├── CrisisModal.tsx       # Emergency resources
│   ├── PHQ9Modal.tsx         # Depression screening
│   ├── Dashboard.tsx         # Analytics & charts
│   ├── BreathingExercise.tsx # Breathing tool
│   ├── GroundingExercise.tsx # 5-4-3-2-1 exercise
│   ├── Journal.tsx           # Journaling tool
│   └── ProfessionalsView.tsx # Find help nearby
├── services/
│   ├── groq.ts          # AI chat service
│   ├── firebase.ts      # Auth & database
│   └── location.ts      # Geolocation & maps
├── utils/
│   ├── types.ts         # TypeScript types
│   ├── sanitize.ts      # Input sanitization
│   ├── emotions.ts      # Emotion detection
│   ├── crisis.ts        # Crisis detection
│   └── cn.ts            # Class name utility
└── index.css            # Global styles
```

## Error Handling
All errors are displayed in warm, human language:
- No API key → "I need a little setup..."
- Invalid key → "That key doesn't seem to work..."
- Rate limited → "I need a brief moment to catch my breath..."
- Offline → "Looks like we lost our connection..."
- Firebase errors → "Had trouble saving that..."
- Empty messages → "Looks like an empty message..."
- Long messages → "Could you share a bit at a time?"

## Conversation Rules
1. AI sends first message (personalized greeting)
2. First 5 messages: only listen and validate
3. Infer age/gender/concerns silently
4. One question maximum per response
5. Always validate before advising
6. Match user's energy and language
7. Never sound clinical or like a survey

## License
MIT
