
import React, { useMemo } from 'react';
import { ActivityLog } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface MonthlyUsageProps {
  activityLogs: ActivityLog[];
}

const MonthlyUsage: React.FC<MonthlyUsageProps> = ({ activityLogs }) => {
  const usageData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter usage events from this month
    const monthlyUsageLogs = activityLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return (
        log.metadata?.isUsage &&
        logDate.getMonth() === currentMonth &&
        logDate.getFullYear() === currentYear
      );
    });

    // Group by Spice Name
    const usageMap: Record<string, number> = {};
    monthlyUsageLogs.forEach(log => {
      const name = log.metadata?.spiceName || 'Unknown';
      const amount = log.metadata?.amount || 0;
      usageMap[name] = (usageMap[name] || 0) + amount;
    });

    return Object.entries(usageMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [activityLogs]);

  const totalUsage = useMemo(() => usageData.reduce((acc, curr) => acc + curr.value, 0), [usageData]);
  const mostUsed = usageData[0] || { name: 'N/A', value: 0 };

  const COLORS = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa'];

  return (
    <div className="animate-fade-in space-y-10">
      <div>
        <h2 className="text-4xl font-black text-orange-950">Monthly Analytics</h2>
        <p className="text-sm text-gray-500 mt-2 font-medium">Tracking stock-out and consumption patterns for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-orange-100 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Consumption</div>
          <div className="text-4xl font-black text-orange-600">{totalUsage.toFixed(1)} <span className="text-lg font-bold text-gray-400">kg</span></div>
          <div className="mt-4 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full self-start">Live Tracking Active</div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-orange-100 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">High Demand Spice</div>
          <div className="text-3xl font-black text-orange-950 truncate">{mostUsed.name}</div>
          <div className="mt-4 text-xs font-bold text-orange-600">{mostUsed.value.toFixed(1)} kg used this month</div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-orange-100 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Operations</div>
          <div className="text-4xl font-black text-gray-800">{usageData.length}</div>
          <div className="mt-4 text-xs font-bold text-gray-400">Unique spices utilized</div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] border border-orange-100 shadow-sm">
        <h3 className="text-lg font-black text-orange-950 mb-8 uppercase tracking-tight">Usage Breakdown by Spice</h3>
        {usageData.length > 0 ? (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usageData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 700 }}
                />
                <Tooltip 
                  cursor={{ fill: '#fff7ed' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #ffedd5', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={40}>
                  {usageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-20 text-center flex flex-col items-center gap-4">
            <div className="p-4 bg-orange-50 rounded-full text-orange-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" />
              </svg>
            </div>
            <div className="text-gray-400 font-medium">No usage data recorded for this month yet.</div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-orange-100 shadow-sm overflow-hidden">
        <div className="px-10 py-6 border-b border-orange-50 bg-orange-50/20">
          <h3 className="text-sm font-black text-orange-950 uppercase tracking-widest">Recent Usage Feed</h3>
        </div>
        <div className="divide-y divide-orange-50">
          {activityLogs.filter(l => l.metadata?.isUsage).slice(0, 10).map((log) => (
            <div key={log.id} className="px-10 py-5 flex justify-between items-center hover:bg-orange-50/10 transition-colors">
              <div>
                <div className="text-sm font-bold text-gray-900">{log.metadata?.spiceName}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase mt-1">{new Date(log.timestamp).toLocaleString()}</div>
              </div>
              <div className="text-sm font-black text-red-500">
                -{log.metadata?.amount} kg
              </div>
            </div>
          ))}
          {activityLogs.filter(l => l.metadata?.isUsage).length === 0 && (
             <div className="px-10 py-10 text-center text-gray-400 text-sm italic">No recent usage entries.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyUsage;
