import { HealthProfile, HealthProfileData } from '../components/HealthProfile';
import { useDemoData } from '../hooks/useDemoData';

export const ProfilePage = () => {
  const { currentPatient } = useDemoData();

  if (!currentPatient) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );
  }

  const profileData: HealthProfileData = {
    name: currentPatient.name,
    age: currentPatient.age,
    gestationalWeek: currentPatient.gestationalWeek,
    dueDate: currentPatient.dueDate,
    riskLevel: currentPatient.riskLevel,
    recentSymptoms: currentPatient.recentSymptoms,
    upcomingReminders: currentPatient.upcomingReminders,
    folicAcidAdherence: currentPatient.folicAcidAdherence,
    lastCheckup: currentPatient.lastCheckup
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-pink-50 to-purple-50 py-6">
      <HealthProfile data={profileData} />
    </div>
  );
};
