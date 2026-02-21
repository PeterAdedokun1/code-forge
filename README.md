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

### Backend (Planned)
- **Node.js** with Express
- **WebSocket** for real-time communication
- **Google Gemini Live API** for AI conversations
- **Supabase** for database and authentication

### Database
- **PostgreSQL** via Supabase
- Tables: profiles, conversations, risk_assessments, symptoms, providers, alerts, reminders
- Row Level Security (RLS) enabled
- Full audit trail

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
# .env file is already configured with Supabase credentials
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

## Database Schema

### Core Tables

#### profiles
Patient information including gestational age, due date, and health history

#### conversations
AI conversation transcripts with detected symptoms and sentiment

#### risk_assessments
Calculated risk scores with contributing factors

#### symptoms
Individual symptom reports with severity and duration

#### providers
Healthcare facilities and community health workers

#### alerts
Escalation alerts to providers with priority levels

#### reminders
Medication and appointment reminders

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

This project was built for the Cavista Hackathon. Contributions are welcome!

## License

MIT License - See LICENSE file for details

## Contact

For questions or support, contact the MIMI team.

## Acknowledgments

- Built for Nigerian mothers
- Inspired by frontline health workers
- Powered by Google Gemini AI
- Data infrastructure by Supabase

---

**Made with ❤️ for maternal health in Nigeria**
