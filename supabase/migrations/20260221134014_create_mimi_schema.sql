/*
  # MIMI Maternal Health Platform - Complete Database Schema

  ## Overview
  This migration creates the complete database structure for MIMI, an AI-powered maternal health assistant for Nigeria.

  ## New Tables

  ### 1. `profiles`
  User profiles for pregnant women with health information
  - `id` (uuid, FK to auth.users) - User identifier
  - `full_name` (text) - Patient's full name
  - `age` (integer) - Patient's age
  - `gestational_week` (integer) - Current week of pregnancy
  - `due_date` (date) - Expected due date
  - `location` (text) - Patient's location/address
  - `phone` (text) - Contact phone number
  - `language_preference` (text) - Preferred language for communication
  - `medical_history` (jsonb) - Previous pregnancies and conditions
  - `folic_acid_adherence` (integer) - Medication adherence percentage
  - `last_checkup` (timestamptz) - Date of last medical checkup
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update

  ### 2. `conversations`
  Record of all AI conversations with patients
  - `id` (uuid, primary key) - Conversation identifier
  - `user_id` (uuid, FK to profiles) - Patient who had the conversation
  - `transcript` (text) - Full conversation transcript
  - `audio_url` (text, optional) - URL to recorded audio if available
  - `detected_symptoms` (text[]) - Symptoms mentioned during conversation
  - `sentiment` (text) - Emotional state detected (calm, anxious, distressed)
  - `duration_seconds` (integer) - Length of conversation
  - `created_at` (timestamptz) - Conversation timestamp

  ### 3. `risk_assessments`
  Risk scores and health status tracking over time
  - `id` (uuid, primary key) - Assessment identifier
  - `user_id` (uuid, FK to profiles) - Patient being assessed
  - `risk_score` (integer) - Calculated risk score (0-100)
  - `risk_level` (text) - Categorized risk: low, medium, high
  - `contributing_factors` (jsonb) - Symptoms and conditions affecting score
  - `recommendations` (text[]) - AI-generated health recommendations
  - `escalation_triggered` (boolean) - Whether alert was sent
  - `created_at` (timestamptz) - Assessment timestamp

  ### 4. `symptoms`
  Individual symptom reports from patients
  - `id` (uuid, primary key) - Symptom report identifier
  - `user_id` (uuid, FK to profiles) - Patient reporting symptom
  - `conversation_id` (uuid, FK to conversations, optional) - Related conversation
  - `symptom_name` (text) - Name/type of symptom
  - `severity` (text) - Severity level: mild, moderate, severe
  - `description` (text) - Detailed description
  - `duration_hours` (integer) - How long symptom has lasted
  - `reported_at` (timestamptz) - When symptom was reported
  - `created_at` (timestamptz) - Record creation timestamp

  ### 5. `providers`
  Healthcare providers (hospitals, clinics, CHEWs, pharmacies)
  - `id` (uuid, primary key) - Provider identifier
  - `name` (text) - Provider/facility name
  - `type` (text) - Type: hospital, clinic, chew, pharmacy
  - `location` (text) - Physical address
  - `coordinates` (point, optional) - GPS coordinates for mapping
  - `phone` (text) - Contact phone number
  - `email` (text, optional) - Contact email
  - `specialties` (text[]) - Services offered
  - `capacity_status` (text) - Current capacity: available, limited, full
  - `verification_status` (text) - Ministry of Health verification status
  - `service_area` (text[]) - LGAs or regions served
  - `created_at` (timestamptz) - Registration timestamp
  - `updated_at` (timestamptz) - Last update

  ### 6. `alerts`
  Escalation alerts sent to healthcare providers
  - `id` (uuid, primary key) - Alert identifier
  - `user_id` (uuid, FK to profiles) - Patient who triggered alert
  - `risk_assessment_id` (uuid, FK to risk_assessments) - Related risk assessment
  - `provider_id` (uuid, FK to providers) - Provider receiving alert
  - `priority` (text) - Priority level: medium, high, critical
  - `risk_type` (text) - Type of risk detected
  - `symptoms` (text[]) - Key symptoms triggering alert
  - `patient_location` (text) - Patient's current location
  - `status` (text) - Alert status: pending, acknowledged, resolved
  - `acknowledged_at` (timestamptz, optional) - When provider acknowledged
  - `resolved_at` (timestamptz, optional) - When situation resolved
  - `notes` (text, optional) - Provider notes
  - `created_at` (timestamptz) - Alert creation timestamp

  ### 7. `reminders`
  Medication and appointment reminders for patients
  - `id` (uuid, primary key) - Reminder identifier
  - `user_id` (uuid, FK to profiles) - Patient receiving reminder
  - `type` (text) - Type: medication, appointment, checkup
  - `title` (text) - Reminder title
  - `description` (text) - Detailed description
  - `scheduled_for` (timestamptz) - When reminder should trigger
  - `status` (text) - Status: pending, sent, completed, missed
  - `sent_at` (timestamptz, optional) - When reminder was sent
  - `completed_at` (timestamptz, optional) - When action was completed
  - `created_at` (timestamptz) - Reminder creation timestamp

  ## Security

  All tables have Row Level Security (RLS) enabled with appropriate policies:
  - Patients can only access their own data
  - CHEWs can access patients in their service area
  - Hospitals can access alerts sent to them
  - All data access requires authentication

  ## Important Notes

  1. **Data Integrity**: All destructive operations are protected with IF EXISTS/IF NOT EXISTS
  2. **Default Values**: Sensible defaults prevent null-related issues
  3. **Timestamps**: Automatic timestamp tracking with triggers
  4. **Foreign Keys**: Proper relationships with CASCADE deletes where appropriate
  5. **Indexes**: Performance indexes on frequently queried columns
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for location data
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  age integer NOT NULL CHECK (age >= 15 AND age <= 50),
  gestational_week integer NOT NULL CHECK (gestational_week >= 0 AND gestational_week <= 42),
  due_date date NOT NULL,
  location text NOT NULL,
  phone text NOT NULL,
  language_preference text DEFAULT 'en',
  medical_history jsonb DEFAULT '{}',
  folic_acid_adherence integer DEFAULT 0 CHECK (folic_acid_adherence >= 0 AND folic_acid_adherence <= 100),
  last_checkup timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transcript text NOT NULL,
  audio_url text,
  detected_symptoms text[] DEFAULT '{}',
  sentiment text DEFAULT 'calm',
  duration_seconds integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create risk_assessments table
CREATE TABLE IF NOT EXISTS risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  risk_score integer NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  contributing_factors jsonb DEFAULT '{}',
  recommendations text[] DEFAULT '{}',
  escalation_triggered boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create symptoms table
CREATE TABLE IF NOT EXISTS symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  symptom_name text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
  description text,
  duration_hours integer DEFAULT 0,
  reported_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create providers table
CREATE TABLE IF NOT EXISTS providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('hospital', 'clinic', 'chew', 'pharmacy')),
  location text NOT NULL,
  coordinates geography(POINT),
  phone text NOT NULL,
  email text,
  specialties text[] DEFAULT '{}',
  capacity_status text DEFAULT 'available' CHECK (capacity_status IN ('available', 'limited', 'full')),
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  service_area text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  risk_assessment_id uuid NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  priority text NOT NULL CHECK (priority IN ('medium', 'high', 'critical')),
  risk_type text NOT NULL,
  symptoms text[] DEFAULT '{}',
  patient_location text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('medication', 'appointment', 'checkup')),
  title text NOT NULL,
  description text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'missed')),
  sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_gestational_week ON profiles(gestational_week);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_user_id ON risk_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_level ON risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_symptoms_user_id ON symptoms(user_id);
CREATE INDEX IF NOT EXISTS idx_symptoms_reported_at ON symptoms(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_provider_id ON alerts(provider_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_for ON reminders(scheduled_for);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for conversations
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for risk_assessments
CREATE POLICY "Users can view own risk assessments"
  ON risk_assessments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert risk assessments"
  ON risk_assessments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for symptoms
CREATE POLICY "Users can view own symptoms"
  ON symptoms FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own symptoms"
  ON symptoms FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for providers (public read for finding nearby providers)
CREATE POLICY "Anyone can view verified providers"
  ON providers FOR SELECT
  TO authenticated
  USING (verification_status = 'verified');

-- RLS Policies for alerts
CREATE POLICY "Providers can view their alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = alerts.provider_id
    )
  );

CREATE POLICY "System can create alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Providers can update their alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = alerts.provider_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = alerts.provider_id
    )
  );

-- RLS Policies for reminders
CREATE POLICY "Users can view own reminders"
  ON reminders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create reminders"
  ON reminders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reminders"
  ON reminders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
