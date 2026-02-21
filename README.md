# MIMI - Maternal Intelligence

AI-powered maternal health assistant for pregnant women in Nigeria. MIMI uses voice interactions and intelligent risk detection to improve maternal health outcomes.

## Overview

MIMI is a Progressive Web App (PWA) that provides:
- **Voice-First Interface**: Natural conversations with AI assistant
- **Intelligent Risk Detection**: Real-time monitoring of maternal health risks
- **Tiered Escalation**: Automatic alerts to CHEWs and hospitals when needed
- **Memory & Context**: Remembers patient history for personalized care
- **Multi-Language Support**: English, Pidgin, Yoruba, Hausa, Igbo
- **Offline Capability**: Works without internet connection

## Features

### For Pregnant Women
- Daily health check-ins via voice
- Symptom tracking and reporting
- Medication reminders (folic acid)
- Appointment scheduling
- Risk level monitoring
- Educational content

### For Community Health Workers (CHEWs)
- Patient dashboard with risk levels
- Conversation history access
- Real-time alerts for medium-risk patients
- Contact management
- Progress tracking

### For Hospitals
- Emergency alert system
- Critical risk notifications
- Patient location and ETA
- Full medical history access
- Alert acknowledgment system

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide React** for icons
- **Recharts** for data visualization
- **PWA** with offline support

### Backend
- **Node.js** with Express
- **Google Gemini Live API** for conversational AI
- **SQLite** for lightweight local database storage

### Database Tables
- `profiles`, `conversations`, `risk_assessments`, `alerts`

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd mimi
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
# Copy .env.example to .env and configure your Gemini API key
cp .env.example .env
```

4. Run development server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The production build will be in the `dist` folder.

## Demo Mode

The app includes a comprehensive demo mode with:
- 5 sample pregnant women with varying risk levels
- Sample conversation history
- Real-time alert demonstrations
- Sample provider network

### Switching User Roles

To view different dashboards, add a query parameter:
- Patient view: `http://localhost:5173/`
- CHEW dashboard: `http://localhost:5173/?role=chew`
- Hospital alerts: `http://localhost:5173/?role=hospital`

## Core Database Structure

- `profiles`: Patient information (gestational age, due date, etc.)
- `conversations`: Transcript history and detected symptoms
- `risk_assessments`: Calculated risk scores and levels
- `alerts`: Escalation tickets to community health workers

## Voice Features

The app uses Web Speech API for:
- Real-time voice recording
- Speech-to-text transcription
- Audio visualization
- Microphone permission handling

Browser compatibility:
- Chrome/Edge: Full support
- Safari: Full support
- Firefox: Limited support

## Progressive Web App (PWA)

MIMI is installable on:
- Android devices
- iOS devices (via Safari)
- Desktop (Chrome, Edge)

Features when installed:
- Offline access
- Home screen icon
- Full screen mode
- Background sync
- Push notifications (planned)

## Security & Privacy

- All data encrypted in transit and at rest
- Row Level Security (RLS) on all database tables
- Patients can only access their own data
- HIPAA-compliant data handling
- Regular security audits

## Contributing

This project is open-source. Feel free to open issues or submit PRs.

## License

MIT License
