import { useState } from 'react';
import { Search, Phone, Filter, AlertTriangle, Calendar, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export interface Patient {
  id: string;
  name: string;
  age: number;
  gestationalWeek: number;
  riskLevel: 'low' | 'medium' | 'high';
  lastConversation: string;
  pendingActions: number;
  location: string;
  phone: string;
  riskHistory: Array<{ date: string; score: number }>;
  recentSymptoms: string[];
}

interface CHEWDashboardProps {
  patients: Patient[];
  chewName: string;
}

export const CHEWDashboard = ({ patients, chewName }: CHEWDashboardProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         patient.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterRisk === 'all' || patient.riskLevel === filterRisk;
    return matchesSearch && matchesFilter;
  });

  const getRiskBadge = (level: 'low' | 'medium' | 'high') => {
    const config = {
      low: { bg: 'bg-green-100', text: 'text-green-800', label: 'Low Risk' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medium Risk' },
      high: { bg: 'bg-red-100', text: 'text-red-800', label: 'High Risk' }
    };
    const { bg, text, label } = config[level];
    return (
      <span className={`${bg} ${text} px-3 py-1 rounded-full text-xs font-semibold`}>
        {label}
      </span>
    );
  };

  const getRiskCount = (level: 'low' | 'medium' | 'high') => {
    return patients.filter(p => p.riskLevel === level).length;
  };

  if (selectedPatient) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <button
          onClick={() => setSelectedPatient(null)}
          className="mb-4 text-pink-600 hover:text-pink-700 font-medium"
        >
          ← Back to patients
        </button>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedPatient.name}</h2>
                <p className="text-pink-100 mt-1">{selectedPatient.age} years, Week {selectedPatient.gestationalWeek}</p>
                <p className="text-pink-100 text-sm mt-1">{selectedPatient.location}</p>
              </div>
              {getRiskBadge(selectedPatient.riskLevel)}
            </div>

            <button
              onClick={() => window.open(`tel:${selectedPatient.phone}`)}
              className="mt-4 bg-white text-pink-600 px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:bg-pink-50 transition-colors w-full justify-center"
            >
              <Phone className="w-5 h-5" />
              <span>Call {selectedPatient.name}</span>
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-pink-500" />
                Risk Score Trend
              </h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedPatient.riskHistory}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#EC4899" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Symptoms</h3>
              {selectedPatient.recentSymptoms.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent symptoms reported</p>
              ) : (
                <div className="space-y-2">
                  {selectedPatient.recentSymptoms.map((symptom, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      <span className="text-gray-800">{symptom}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Last Conversation</h3>
              <p className="text-gray-600">{selectedPatient.lastConversation}</p>
            </div>

            {selectedPatient.pendingActions > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-xl">
                <p className="font-semibold text-yellow-800">
                  {selectedPatient.pendingActions} pending action{selectedPatient.pendingActions > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-yellow-700 mt-1">Follow up required</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-6 text-white mb-6">
        <h1 className="text-2xl font-bold">Community Health Worker Dashboard</h1>
        <p className="text-pink-100 mt-1">Welcome, {chewName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Patients</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{patients.length}</p>
            </div>
            <div className="bg-pink-100 rounded-full p-3">
              <Calendar className="w-6 h-6 text-pink-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Medium Risk</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{getRiskCount('medium')}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">High Risk</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{getRiskCount('high')}</p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-6">
          <div className="relative flex-1 md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search patients by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredPatients.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No patients found</p>
          ) : (
            filteredPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-bold text-gray-800">{patient.name}</h3>
                    {getRiskBadge(patient.riskLevel)}
                    {patient.pendingActions > 0 && (
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-semibold">
                        {patient.pendingActions} action{patient.pendingActions > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{patient.age} years</span>
                    <span>•</span>
                    <span>Week {patient.gestationalWeek}</span>
                    <span>•</span>
                    <span>{patient.location}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Last conversation: {patient.lastConversation}
                  </p>
                </div>
                <Phone className="w-5 h-5 text-pink-500" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
