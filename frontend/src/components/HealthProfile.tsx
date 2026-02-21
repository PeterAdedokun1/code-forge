import { Calendar, Heart, AlertCircle, CheckCircle, Pill, BellRing } from 'lucide-react';

export interface HealthProfileData {
  name: string;
  age: number;
  gestationalWeek: number;
  dueDate: string;
  riskLevel: 'low' | 'medium' | 'high';
  recentSymptoms: Array<{
    symptom: string;
    date: string;
    severity: 'mild' | 'moderate' | 'severe';
  }>;
  upcomingReminders: Array<{
    type: string;
    description: string;
    date: string;
  }>;
  folicAcidAdherence: number;
  lastCheckup: string;
}

interface HealthProfileProps {
  data: HealthProfileData;
}

export const HealthProfile = ({ data }: HealthProfileProps) => {
  const getRiskConfig = () => {
    switch (data.riskLevel) {
      case 'low':
        return {
          color: 'bg-green-100 border-green-500 text-green-800',
          icon: <CheckCircle className="w-6 h-6" />,
          message: 'All good, Mama!',
          description: 'Keep up the great work with your health routine.'
        };
      case 'medium':
        return {
          color: 'bg-yellow-100 border-yellow-500 text-yellow-800',
          icon: <AlertCircle className="w-6 h-6" />,
          message: "Let's check in with your CHEW",
          description: 'Some symptoms need attention from your community health worker.'
        };
      case 'high':
        return {
          color: 'bg-red-100 border-red-500 text-red-800',
          icon: <AlertCircle className="w-6 h-6" />,
          message: 'Time to see a doctor',
          description: 'Please visit the nearest hospital or clinic as soon as possible.'
        };
    }
  };

  const riskConfig = getRiskConfig();
  const weeksRemaining = 40 - data.gestationalWeek;
  const progressPercentage = (data.gestationalWeek / 40) * 100;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{data.name}</h1>
              <p className="text-pink-100 mt-1">{data.age} years old</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
              <Heart className="w-8 h-8" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-sm text-pink-100">Week</p>
              <p className="text-3xl font-bold mt-1">{data.gestationalWeek}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-sm text-pink-100">Due Date</p>
              <p className="text-lg font-semibold mt-1">{new Date(data.dueDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Pregnancy Progress</span>
              <span>{weeksRemaining} weeks to go</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div
                className="bg-white rounded-full h-3 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className={`border-l-4 ${riskConfig.color} rounded-r-xl p-4 flex items-start space-x-3`}>
            {riskConfig.icon}
            <div className="flex-1">
              <p className="font-bold text-lg">{riskConfig.message}</p>
              <p className="text-sm mt-1">{riskConfig.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-pink-500" />
          Recent Symptoms
        </h2>

        {data.recentSymptoms.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No symptoms reported recently</p>
        ) : (
          <div className="space-y-3">
            {data.recentSymptoms.map((symptom, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      symptom.severity === 'severe'
                        ? 'bg-red-500'
                        : symptom.severity === 'moderate'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                  />
                  <span className="font-medium text-gray-800">{symptom.symptom}</span>
                </div>
                <span className="text-sm text-gray-500">{symptom.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <BellRing className="w-5 h-5 mr-2 text-pink-500" />
          Upcoming Reminders
        </h2>

        {data.upcomingReminders.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No upcoming reminders</p>
        ) : (
          <div className="space-y-3">
            {data.upcomingReminders.map((reminder, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 bg-pink-50 rounded-lg border border-pink-100"
              >
                <div className="bg-pink-500 rounded-full p-2 mt-1">
                  <BellRing className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{reminder.type}</p>
                  <p className="text-sm text-gray-600 mt-1">{reminder.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{reminder.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Pill className="w-5 h-5 mr-2 text-pink-500" />
          Folic Acid Adherence
        </h2>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-end space-x-2 mb-2">
              <span className="text-4xl font-bold text-pink-500">{data.folicAcidAdherence}%</span>
              <span className="text-gray-500 mb-2">this week</span>
            </div>
            <p className="text-sm text-gray-600">
              {data.folicAcidAdherence >= 80
                ? "Excellent! You're doing great!"
                : data.folicAcidAdherence >= 50
                ? "Good, but try to be more consistent"
                : "Let's work on taking your medication daily"}
            </p>
          </div>
          <div className="w-24 h-24">
            <svg className="transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#FEE2E2"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#EC4899"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${(data.folicAcidAdherence / 100) * 251.2} 251.2`}
                className="transition-all duration-1000"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 text-center">
        <p className="text-sm text-gray-600">
          Last checkup: <span className="font-medium text-gray-800">{data.lastCheckup}</span>
        </p>
      </div>
    </div>
  );
};
