
import React, { useState } from 'react';
import { UserProfile, ChatMessage, ActivityLog } from '../types';

interface SettingsProps {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  chatHistory: ChatMessage[];
  activityLogs: ActivityLog[];
}

const Settings: React.FC<SettingsProps> = ({ profile, onUpdateProfile, chatHistory, activityLogs }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'chat' | 'activity'>('profile');
  const [email, setEmail] = useState(profile.email);
  const [mobile, setMobile] = useState(profile.mobile);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({ email, mobile });
    alert("Profile saved successfully!");
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">Control Center</h2>
        <p className="text-gray-500">Manage your profile and review operational history</p>
      </div>

      <div className="flex gap-4 border-b border-orange-100 pb-1">
        <button 
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'profile' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          User Profile
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'chat' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          AI Chat History
        </button>
        <button 
          onClick={() => setActiveTab('activity')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'activity' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Modification Logs
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-orange-100 min-h-[500px]">
        {activeTab === 'profile' && (
          <div className="p-10 max-w-md">
            <h3 className="text-xl font-bold text-orange-950 mb-6">Contact Information</h3>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@factory.com"
                  className="w-full bg-gray-50 border border-orange-100 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Mobile Number</label>
                <input 
                  type="tel" 
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-gray-50 border border-orange-100 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-orange-600 text-white font-black rounded-2xl shadow-lg hover:bg-orange-700 transition-all active:scale-95"
              >
                Update Profile
              </button>
            </form>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="p-6">
            <div className="space-y-4">
              {chatHistory.length === 0 ? (
                <div className="text-center py-20 text-gray-400">No AI interaction history found.</div>
              ) : (
                chatHistory.map((chat, idx) => (
                  <div key={idx} className={`flex flex-col ${chat.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className="text-[9px] font-bold text-gray-400 mb-1 px-2 uppercase">
                      {new Date(chat.timestamp).toLocaleString()} • {chat.role === 'user' ? 'You' : 'Bitta AI'}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm shadow-sm border ${
                      chat.role === 'user' 
                        ? 'bg-orange-600 text-white border-orange-500' 
                        : 'bg-orange-50 text-orange-950 border-orange-100'
                    }`}>
                      {chat.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-orange-50">
              <thead className="bg-orange-50/30">
                <tr>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-orange-900 uppercase tracking-widest">Timestamp</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-orange-900 uppercase tracking-widest">Type</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-orange-900 uppercase tracking-widest">Action</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-orange-900 uppercase tracking-widest">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-50">
                {activityLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-gray-400">No logs recorded yet.</td>
                  </tr>
                ) : (
                  [...activityLogs].reverse().map((log) => (
                    <tr key={log.id} className="hover:bg-orange-50/20 transition-colors">
                      <td className="px-8 py-5 text-xs font-mono text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-8 py-5">
                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${
                          log.type === 'stock' ? 'bg-green-100 text-green-700' : 
                          log.type === 'ai' ? 'bg-purple-100 text-purple-700' : 
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-orange-900">{log.action}</td>
                      <td className="px-8 py-5 text-sm text-gray-600">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
