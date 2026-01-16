
import React from 'react';
import { SpiceItem } from '../types';

interface InventoryTableProps {
  items: SpiceItem[];
  onUpdateItem: (id: string, updates: Partial<SpiceItem>) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: () => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ items, onUpdateItem, onDeleteItem, onAddItem }) => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center px-2">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Active Stock Ledger</h3>
        <button 
          onClick={onAddItem}
          className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-xl text-[10px] font-black uppercase hover:bg-orange-200 transition-all active:scale-95 shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
          Quick Add Row
        </button>
      </div>
      
      <div className="overflow-x-auto bg-white rounded-[2rem] shadow-xl shadow-orange-950/5 border border-orange-100">
        <table className="min-w-full divide-y divide-orange-50 border-collapse">
          <thead className="bg-orange-50/50">
            <tr>
              <th className="px-6 py-5 text-left text-[10px] font-black text-orange-950 uppercase tracking-widest border-b border-orange-100/50">Spice Name</th>
              <th className="px-6 py-5 text-left text-[10px] font-black text-orange-950 uppercase tracking-widest border-b border-orange-100/50">Cat.</th>
              <th className="px-6 py-5 text-left text-[10px] font-black text-orange-950 uppercase tracking-widest border-b border-orange-100/50">Qty</th>
              <th className="px-6 py-5 text-left text-[10px] font-black text-orange-950 uppercase tracking-widest border-b border-orange-100/50">Unit</th>
              <th className="px-6 py-5 text-left text-[10px] font-black text-orange-950 uppercase tracking-widest border-b border-orange-100/50">Location</th>
              <th className="px-6 py-5 text-left text-[10px] font-black text-orange-950 uppercase tracking-widest border-b border-orange-100/50">Supplier</th>
              <th className="px-6 py-5 text-left text-[10px] font-black text-orange-950 uppercase tracking-widest border-b border-orange-100/50">Status</th>
              <th className="px-6 py-5 text-center text-[10px] font-black text-orange-950 uppercase tracking-widest border-b border-orange-100/50">Tools</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-orange-50">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-orange-50/30 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => onUpdateItem(item.id, { name: e.target.value })}
                    className="w-full bg-transparent border-none focus:ring-0 rounded px-1 font-bold text-gray-950 text-sm outline-none"
                  />
                  <div className="text-[9px] text-gray-300 mt-0.5 px-1 font-bold uppercase tracking-tighter">ID: {item.id.slice(0, 5)}...</div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg uppercase tracking-tight">
                    {item.category}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => onUpdateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                    className="w-16 bg-gray-50 border border-gray-100 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-orange-500 outline-none font-black text-gray-900 text-xs transition-all"
                  />
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-gray-400 uppercase tracking-tighter">
                  {item.unit}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <input
                      type="text"
                      value={item.location}
                      onChange={(e) => onUpdateItem(item.id, { location: e.target.value })}
                      className="w-32 bg-transparent border-none focus:ring-0 p-0 text-xs text-gray-600 outline-none"
                    />
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="text"
                    value={item.supplier}
                    onChange={(e) => onUpdateItem(item.id, { supplier: e.target.value })}
                    className="w-32 bg-transparent border-none focus:ring-0 p-0 text-xs text-gray-400 font-medium outline-none truncate"
                  />
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    item.quantity > 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${item.quantity > 50 ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                    {item.quantity > 50 ? 'Optimal' : 'Low Stock'}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <button 
                    onClick={() => onDeleteItem(item.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="py-24 text-center flex flex-col items-center gap-4 bg-gray-50/50">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-orange-200 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <div className="text-orange-950 font-black text-sm uppercase tracking-widest">No Inventory Records</div>
              <p className="text-gray-400 text-xs mt-1 font-medium italic">Empty ledger for this category.</p>
            </div>
            <button 
              onClick={onAddItem}
              className="mt-2 px-6 py-2.5 bg-white border border-orange-100 text-orange-600 rounded-xl text-[10px] font-black uppercase hover:bg-orange-50 transition-all shadow-sm"
            >
              Add First Record
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryTable;
