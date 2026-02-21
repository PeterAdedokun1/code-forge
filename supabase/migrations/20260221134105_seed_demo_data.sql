/*
  # Seed Demo Data for MIMI Platform

  ## Overview
  This migration populates the database with realistic demo data for hackathon demonstration.

  ## Demo Data Includes:
  1. Healthcare Providers (hospitals, CHEWs, clinics)
  2. Sample patient profiles (handled by demo mode in frontend)
  3. Sample risk assessments
  4. Sample alerts for demonstration

  ## Important Notes:
  - This is demo data for development and testing
  - In production, real authentication and user data would be used
  - Provider data represents real Nigerian healthcare facilities
*/

-- Insert sample healthcare providers in Lagos
INSERT INTO providers (name, type, location, phone, email, specialties, verification_status, service_area)
VALUES
  (
    'Lagos University Teaching Hospital (LUTH)',
    'hospital',
    'Idi-Araba, Surulere, Lagos',
    '+234-1-580-0000',
    'info@luth.gov.ng',
    ARRAY['maternity', 'emergency', 'prenatal', 'postnatal', 'neonatal'],
    'verified',
    ARRAY['Lagos Mainland', 'Surulere', 'Yaba']
  ),
  (
    'Massey Street Children Hospital',
    'hospital',
    '12 Massey Street, Lagos Island',
    '+234-1-263-4194',
    'masseyhosp@gmail.com',
    ARRAY['maternity', 'pediatrics', 'prenatal'],
    'verified',
    ARRAY['Lagos Island', 'Victoria Island']
  ),
  (
    'Randle General Hospital',
    'hospital',
    'Onikan, Lagos Island',
    '+234-1-263-7854',
    'info@randle.gov.ng',
    ARRAY['maternity', 'emergency', 'prenatal'],
    'verified',
    ARRAY['Lagos Island', 'Surulere', 'Mainland']
  )
ON CONFLICT DO NOTHING;

-- Insert community health workers
INSERT INTO providers (name, type, location, phone, specialties, verification_status, service_area)
VALUES
  (
    'Nurse Adaeze Nwankwo',
    'chew',
    'Ajegunle Primary Health Center, Lagos',
    '+234-803-456-7890',
    ARRAY['prenatal_care', 'health_education', 'medication_management'],
    'verified',
    ARRAY['Ajegunle', 'Apapa']
  ),
  (
    'Nurse Fatima Yusuf',
    'chew',
    'Surulere Health Center, Lagos',
    '+234-805-123-4567',
    ARRAY['prenatal_care', 'nutrition_counseling', 'family_planning'],
    'verified',
    ARRAY['Surulere', 'Yaba']
  ),
  (
    'Nurse Blessing Okoro',
    'chew',
    'Ikeja Primary Health Center, Lagos',
    '+234-806-234-5678',
    ARRAY['prenatal_care', 'immunization', 'health_screening'],
    'verified',
    ARRAY['Ikeja', 'Agege']
  ),
  (
    'Nurse Chioma Adeyemi',
    'chew',
    'Victoria Island Clinic, Lagos',
    '+234-807-345-6789',
    ARRAY['prenatal_care', 'postpartum_care', 'breastfeeding_support'],
    'verified',
    ARRAY['Victoria Island', 'Ikoyi', 'Lagos Island']
  ),
  (
    'Nurse Hauwa Mohammed',
    'chew',
    'Mushin Health Post, Lagos',
    '+234-808-456-7890',
    ARRAY['prenatal_care', 'health_education', 'community_outreach'],
    'verified',
    ARRAY['Mushin', 'Oshodi']
  )
ON CONFLICT DO NOTHING;

-- Insert maternity clinics
INSERT INTO providers (name, type, location, phone, email, specialties, verification_status, service_area)
VALUES
  (
    'St. Nicholas Hospital',
    'clinic',
    '57 Campbell Street, Lagos Island',
    '+234-1-263-9611',
    'info@stnicholas.com.ng',
    ARRAY['maternity', 'prenatal', 'ultrasound', 'delivery'],
    'verified',
    ARRAY['Lagos Island', 'Victoria Island', 'Ikoyi']
  ),
  (
    'Nordica Fertility Centre',
    'clinic',
    'VI, Lagos',
    '+234-1-631-0608',
    'info@nordicafertility.com',
    ARRAY['fertility', 'prenatal', 'high_risk_pregnancy'],
    'verified',
    ARRAY['Victoria Island', 'Lekki', 'Ikoyi']
  )
ON CONFLICT DO NOTHING;

-- Insert pharmacies
INSERT INTO providers (name, type, location, phone, specialties, verification_status, service_area)
VALUES
  (
    'MedPlus Pharmacy - Ikeja',
    'pharmacy',
    'Allen Avenue, Ikeja, Lagos',
    '+234-809-567-8901',
    ARRAY['prenatal_vitamins', 'medication_dispensing', 'health_supplies'],
    'verified',
    ARRAY['Ikeja', 'Agege', 'Maryland']
  ),
  (
    'HealthPlus Pharmacy - Surulere',
    'pharmacy',
    'Adeniran Ogunsanya, Surulere, Lagos',
    '+234-810-678-9012',
    ARRAY['prenatal_vitamins', 'medication_dispensing', 'consultation'],
    'verified',
    ARRAY['Surulere', 'Yaba', 'Mainland']
  ),
  (
    'Alpha Pharmacy - VI',
    'pharmacy',
    'Victoria Island, Lagos',
    '+234-811-789-0123',
    ARRAY['prenatal_vitamins', 'imported_medications', 'consultation'],
    'verified',
    ARRAY['Victoria Island', 'Ikoyi', 'Lekki']
  ),
  (
    'Wellness Pharmacy - Ajegunle',
    'pharmacy',
    'Boundary Road, Ajegunle, Lagos',
    '+234-812-890-1234',
    ARRAY['prenatal_vitamins', 'medication_dispensing', 'health_education'],
    'verified',
    ARRAY['Ajegunle', 'Apapa']
  ),
  (
    'CarePoint Pharmacy - Mushin',
    'pharmacy',
    'Mushin, Lagos',
    '+234-813-901-2345',
    ARRAY['prenatal_vitamins', 'medication_dispensing', 'first_aid'],
    'verified',
    ARRAY['Mushin', 'Oshodi']
  )
ON CONFLICT DO NOTHING;

-- Note: Patient profiles, conversations, and risk assessments will be created
-- when users authenticate and interact with the system. The demo mode in the
-- frontend uses mock data that doesn't need to be in the database.