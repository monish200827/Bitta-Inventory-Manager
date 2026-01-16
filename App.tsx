
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { INITIAL_INVENTORY } from './constants';
import { SpiceItem, InventoryAction, AppView, InventoryGroup, DashboardType, ActivityLog, UserProfile, ChatMessage } from './types';
import InventoryTable from './components/InventoryTable';
import AIAgent from './components/AIAgent';
import ImportManager from './components/ImportManager';
import Settings from './components/Settings';
import MonthlyUsage from './components/MonthlyUsage';
import { exportToExcel } from './utils/excelUtils';

const App: React.FC = () => {
  const [inventoryGroups, setInventoryGroups] = useState<InventoryGroup[]>([
    {
      id: 'default',
      name: 'Primary Warehouse',
      createdAt: new Date().toISOString(),
      items: INITIAL_INVENTORY,
      type: 'regular'
    }
  ]);
  const [activeGroupId, setActiveGroupId] = useState<string>('default');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  const [userProfile, setUserProfile] = useState<UserProfile>({ email: '', mobile: '' });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const [isCreatingDashboard, setIsCreatingDashboard] = useState<{ active: boolean, type: DashboardType }>({ active: false, type: 'regular' });
  const [newDashboardName, setNewDashboardName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const createInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeGroup = useMemo(() => {
    const rawGroup = inventoryGroups.find(g => g.id === activeGroupId) || inventoryGroups[0];
    if (!rawGroup) return { items: [], name: 'Empty', id: 'none', createdAt: '', type: 'regular' as const };

    if (rawGroup.type === 'factory') {
      const smartItems = inventoryGroups
        .filter(g => g.type === 'regular')
        .flatMap(g => g.items)
        .filter(item => item.location.trim().toLowerCase() === rawGroup.name.trim().toLowerCase());
      
      return { ...rawGroup, items: smartItems };
    }
    
    return rawGroup;
  }, [inventoryGroups, activeGroupId]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const allRegularItems = inventoryGroups.filter(g => g.type === 'regular').flatMap(g => g.items);
    
    inventoryGroups.forEach(g => {
      if (g.type === 'factory') {
        counts[g.id] = allRegularItems.filter(item => 
          item.location.trim().toLowerCase() === g.name.trim().toLowerCase()
        ).length;
      } else {
        counts[g.id] = g.items.length;
      }
    });
    return counts;
  }, [inventoryGroups]);

  const addLog = (action: string, details: string, type: 'stock' | 'system' | 'ai', metadata?: any) => {
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      action,
      details,
      type,
      metadata
    };
    setActivityLogs(prev => [...prev, newLog]);
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleUpdateItem = (id: string, updates: Partial<SpiceItem>) => {
    setInventoryGroups(prev => prev.map(group => {
      if (group.type === 'factory') return group; 
      return {
        ...group,
        items: group.items.map(item => {
          if (item.id === id) {
            if (updates.quantity !== undefined && updates.quantity < item.quantity) {
              const diff = item.quantity - updates.quantity;
              addLog('Stock Used', `${item.name}: -${diff}${item.unit}`, 'stock', {
                spiceName: item.name,
                amount: diff,
                isUsage: true
              });
            }
            return { ...item, ...updates, lastUpdated: new Date().toISOString() };
          }
          return item;
        })
      };
    }));
  };

  const handleDeleteItem = (id: string) => {
    const itemToDelete = activeGroup.items.find(i => i.id === id);
    setInventoryGroups(prev => prev.map(group => {
      if (group.type === 'factory') return group;
      return {
        ...group,
        items: group.items.filter(item => item.id !== id)
      };
    }));
    if (itemToDelete) {
      addLog('Item Deleted', `${itemToDelete.name} removed from system`, 'system');
    }
    setNotification({ message: "Item removed from system.", type: 'success' });
  };

  const handleAddManualRow = () => {
    const newItem: SpiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Entry',
      category: 'General',
      quantity: 0,
      unit: 'kg',
      location: activeGroup.type === 'factory' ? activeGroup.name : 'Unassigned',
      supplier: 'Manual Entry',
      lastUpdated: new Date().toISOString(),
      source: 'Manual'
    };

    setInventoryGroups(prev => {
      return prev.map(g => {
        if (g.id === activeGroupId && g.type === 'regular') {
          return { ...g, items: [newItem, ...g.items] };
        }
        return g;
      });
    });

    addLog('Manual Add', `New row added to ${activeGroup.name}`, 'system');
    setNotification({ message: `Added to ${activeGroup.name}.`, type: 'success' });
  };

  const handleBulkImport = (name: string, newItems: Partial<SpiceItem>[]) => {
    const formatted: SpiceItem[] = newItems.map(item => ({
      id: Math.random().toString(36).substr(2, 9),
      name: item.name || 'New Spice',
      category: item.category || 'Whole',
      quantity: item.quantity || 0,
      unit: item.unit || 'kg',
      location: item.location || 'Unassigned',
      supplier: item.supplier || 'Unknown',
      lastUpdated: new Date().toISOString(),
      source: (item.source as any) || 'Excel'
    }));

    const newGroup: InventoryGroup = {
      id: Math.random().toString(36).substr(2, 9),
      name: name || `Import ${new Date().toLocaleDateString()}`,
      createdAt: new Date().toISOString(),
      items: formatted,
      type: 'regular'
    };

    setInventoryGroups(prev => [...prev, newGroup]);
    setActiveGroupId(newGroup.id);
    addLog('Bulk Import', `Created dashboard "${newGroup.name}" with ${formatted.length} items`, 'system');
    setNotification({ message: `Created dashboard: ${newGroup.name}`, type: 'success' });
    setActiveView('dashboard');
  };

  const finalizeCreateDashboard = () => {
    const name = newDashboardName.trim();
    if (!name) { setIsCreatingDashboard({ active: false, type: 'regular' }); return; }

    const newGroup: InventoryGroup = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      createdAt: new Date().toISOString(),
      items: [],
      type: isCreatingDashboard.type
    };

    setInventoryGroups(prev => [...prev, newGroup]);
    setActiveGroupId(newGroup.id);
    addLog('Dashboard Created', `New ${newGroup.type} channel: ${name}`, 'system');
    setNotification({ message: `Created: ${name}`, type: 'success' });
    setActiveView('dashboard');
    setNewDashboardName('');
    setIsCreatingDashboard({ active: false, type: 'regular' });
  };

  const handleRenameDashboard = (id: string, e?: React.MouseEvent | React.FocusEvent, forcedName?: string) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
    const group = inventoryGroups.find(g => g.id === id);
    if (!group) return;
    const newName = forcedName || prompt(`Enter new name for "${group.name}":`, group.name);
    if (newName && newName.trim() !== "" && newName !== group.name) {
      setInventoryGroups(prev => prev.map(g => g.id === id ? { ...g, name: newName.trim() } : g));
      addLog('Dashboard Renamed', `Changed "${group.name}" to "${newName.trim()}"`, 'system');
      setNotification({ message: `Renamed to "${newName.trim()}"`, type: 'success' });
    }
  };

  const handleDeleteDashboard = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (inventoryGroups.length <= 1) { alert("Cannot delete last dashboard."); return; }
    const group = inventoryGroups.find(g => g.id === id);
    if (!group) return;
    if (!e || confirm(`Are you sure you want to delete "${group.name}"?`)) {
      setInventoryGroups(prev => {
        const filtered = prev.filter(g => g.id !== id);
        if (activeGroupId === id) setActiveGroupId(filtered[0].id);
        return filtered;
      });
      addLog('Dashboard Deleted', `Removed channel: ${group.name}`, 'system');
      setNotification({ message: `Deleted: ${group.name}`, type: 'success' });
    }
  };

  const moveGroup = (id: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    setInventoryGroups(prev => {
      const idx = prev.findIndex(g => g.id === id);
      if (idx === -1) return prev;
      
      const itemType = prev[idx].type;
      const sameTypeIndices = prev
        .map((g, i) => g.type === itemType ? i : -1)
        .filter(i => i !== -1);
      
      const currentPosInSameType = sameTypeIndices.indexOf(idx);
      const targetPosInSameType = direction === 'up' ? currentPosInSameType - 1 : currentPosInSameType + 1;
      
      if (targetPosInSameType < 0 || targetPosInSameType >= sameTypeIndices.length) return prev;
      
      const targetIdx = sameTypeIndices[targetPosInSameType];
      const newArr = [...prev];
      const temp = newArr[idx];
      newArr[idx] = newArr[targetIdx];
      newArr[targetIdx] = temp;
      
      return newArr;
    });
    setNotification({ message: "Sequence updated.", type: 'success' });
  };

  const handleAISync = (params: any) => {
    const { spiceName, quantity, action, category, unit, location, supplier, source, dashboardName, dashboardType, targetChannelName, newChannelName, fromLocation, toLocation } = params;

    // Architectural Management Logic for AI
    if (action === 'renameDashboard') {
      const searchName = (targetChannelName || dashboardName || '').toLowerCase();
      const groupToRename = searchName 
        ? inventoryGroups.find(g => g.name.toLowerCase() === searchName) 
        : inventoryGroups.find(g => g.id === activeGroupId);
      
      if (groupToRename && newChannelName) {
        handleRenameDashboard(groupToRename.id, undefined, newChannelName);
      }
      return;
    }

    if (action === 'deleteDashboard') {
      const searchName = (targetChannelName || '').toLowerCase();
      const groupToDelete = searchName 
        ? inventoryGroups.find(g => g.name.toLowerCase() === searchName) 
        : inventoryGroups.find(g => g.id === activeGroupId);
      
      if (groupToDelete) {
        handleDeleteDashboard(groupToDelete.id);
      }
      return;
    }
    
    if (action === 'createDashboard' && dashboardName) {
      const newGroup: InventoryGroup = { 
        id: Math.random().toString(36).substr(2, 9), 
        name: dashboardName, 
        createdAt: new Date().toISOString(), 
        items: [], 
        type: dashboardType || 'regular' 
      };
      setInventoryGroups(prev => [...prev, newGroup]);
      setActiveGroupId(newGroup.id);
      setActiveView('dashboard');
      addLog('AI Structural Update', `AI created new ${newGroup.type === 'factory' ? 'Storage Location' : 'Dashboard'}: ${dashboardName}`, 'ai');
      setNotification({ message: `AI Created: ${dashboardName}`, type: 'success' });
      return;
    }

    // Inventory Sync Logic
    if (action !== 'transfer') {
      setInventoryGroups(prev => {
        const targetDashboardName = dashboardName || location;
        let specificTargetId: string | null = null;
        if (targetDashboardName) {
          const groupByName = prev.find(g => g.name.toLowerCase() === targetDashboardName.toLowerCase() && g.type === 'regular');
          if (groupByName) specificTargetId = groupByName.id;
        }

        return prev.map(group => {
          if (group.type === 'factory') return group;
          if (specificTargetId && group.id !== specificTargetId) return group;
          if (!specificTargetId && action === 'create' && group.id !== activeGroupId) return group;

          let newItems = [...group.items];
          if (action === 'create' && spiceName) {
            const newItem: SpiceItem = { 
              id: Math.random().toString(36).substr(2, 9), 
              name: spiceName, 
              category: (category as any) || 'Whole', 
              quantity: quantity || 0, 
              unit: (unit as any) || 'kg', 
              location: location || group.name, 
              supplier: supplier || 'Various', 
              lastUpdated: new Date().toISOString(), 
              source: source || 'Manual' 
            };
            addLog('Stock Created', `AI added ${spiceName} to ${group.name}`, 'ai');
            return { ...group, items: [...newItems, newItem] };
          }

          if (spiceName) {
            const searchStr = spiceName.toLowerCase();
            let index = newItems.findIndex(i => i.name.toLowerCase() === searchStr);
            if (index === -1) index = newItems.findIndex(i => i.name.toLowerCase().includes(searchStr));
            
            if (index !== -1) {
              if (action === 'delete') {
                addLog('Stock Deleted', `AI removed ${spiceName} from ${group.name}`, 'ai');
                return { ...group, items: newItems.filter((_, i) => i !== index) };
              }

              const item = newItems[index];
              let newQty = item.quantity;
              if (quantity !== undefined && action) {
                if (action === 'add') newQty += quantity;
                else if (action === 'remove') {
                  newQty = Math.max(0, newQty - quantity);
                }
                else if (action === 'set') newQty = quantity;
              }
              newItems[index] = { 
                ...item, 
                quantity: parseFloat(newQty.toFixed(2)), 
                location: location || item.location, 
                supplier: supplier || item.supplier, 
                category: category || item.category, 
                unit: unit || item.unit, 
                lastUpdated: new Date().toISOString() 
              };
            }
          }
          return { ...group, items: newItems };
        });
      });
    } else {
      if (!spiceName || quantity === undefined || !fromLocation || !toLocation) return;
      setInventoryGroups(prev => {
        const sourceAsDashboard = prev.find(g => g.name.toLowerCase() === fromLocation.toLowerCase() && g.type === 'regular');
        const sourceAsFactory = prev.find(g => g.name.toLowerCase() === fromLocation.toLowerCase() && g.type === 'factory');
        const destAsDashboard = prev.find(g => g.name.toLowerCase() === toLocation.toLowerCase() && g.type === 'regular');
        const destAsFactory = prev.find(g => g.name.toLowerCase() === toLocation.toLowerCase() && g.type === 'factory');

        let targetItem: SpiceItem | null = null;
        let sourceGroupId: string | null = null;

        if (sourceAsDashboard) {
           const found = sourceAsDashboard.items.find(i => i.name.toLowerCase().includes(spiceName.toLowerCase()));
           if (found) { targetItem = found; sourceGroupId = sourceAsDashboard.id; }
        } else if (sourceAsFactory) {
           for (const g of prev) {
             if (g.type === 'regular') {
                const found = g.items.find(i => i.name.toLowerCase().includes(spiceName.toLowerCase()) && i.location.toLowerCase() === sourceAsFactory.name.toLowerCase());
                if (found) { targetItem = found; sourceGroupId = g.id; break; }
             }
           }
        }

        if (!targetItem || !sourceGroupId) return prev;

        const targetDashboardId = destAsDashboard ? destAsDashboard.id : sourceGroupId;
        const newLocationTag = destAsFactory ? destAsFactory.name : (destAsDashboard ? targetItem.location : targetItem.location);

        return prev.map(g => {
          if (g.type === 'factory') return g;
          let items = [...g.items];
          if (g.id === sourceGroupId) {
             const idx = items.findIndex(i => i.id === targetItem!.id);
             if (idx !== -1) {
                const currentQty = items[idx].quantity;
                const remainingQty = parseFloat((currentQty - quantity).toFixed(2));
                if (sourceGroupId === targetDashboardId && items[idx].location.toLowerCase() !== newLocationTag.toLowerCase()) {
                   items[idx] = { ...items[idx], quantity: remainingQty, lastUpdated: new Date().toISOString() };
                   const existingAtDestIdx = items.findIndex(i => i.name.toLowerCase() === targetItem!.name.toLowerCase() && i.location.toLowerCase() === newLocationTag.toLowerCase());
                   if (existingAtDestIdx !== -1) {
                      items[existingAtDestIdx] = { 
                        ...items[existingAtDestIdx], 
                        quantity: parseFloat((items[existingAtDestIdx].quantity + quantity).toFixed(2)),
                        lastUpdated: new Date().toISOString()
                      };
                   } else {
                      items.push({
                        ...targetItem!,
                        id: Math.random().toString(36).substr(2, 9),
                        quantity: quantity,
                        location: newLocationTag,
                        lastUpdated: new Date().toISOString()
                      });
                   }
                   if (items[idx].quantity <= 0) items = items.filter((_, i) => i !== idx);
                } else if (sourceGroupId !== targetDashboardId) {
                   if (remainingQty <= 0) items = items.filter(i => i.id !== targetItem!.id);
                   else items[idx] = { ...items[idx], quantity: remainingQty, lastUpdated: new Date().toISOString() };
                }
             }
          }
          if (g.id === targetDashboardId && sourceGroupId !== targetDashboardId) {
             const existingIdx = items.findIndex(i => i.name.toLowerCase() === targetItem!.name.toLowerCase() && i.location.toLowerCase() === newLocationTag.toLowerCase());
             if (existingIdx !== -1) {
                items[existingIdx] = { 
                   ...items[existingIdx], 
                   quantity: parseFloat((items[existingIdx].quantity + quantity).toFixed(2)),
                   lastUpdated: new Date().toISOString()
                };
             } else {
                items.push({
                   ...targetItem!,
                   id: Math.random().toString(36).substr(2, 9),
                   quantity,
                   location: newLocationTag,
                   lastUpdated: new Date().toISOString()
                });
             }
          }
          return { ...g, items };
        });
      });
    }
  };

  const handleDirectFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setActiveView('import-manager');
      e.target.value = '';
    }
  };

  const filteredItems = useMemo(() => {
    return (activeGroup?.items || []).filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [activeGroup, searchTerm]);

  const factoryGroups = useMemo(() => inventoryGroups.filter(g => g.type === 'factory'), [inventoryGroups]);
  const regularGroups = useMemo(() => inventoryGroups.filter(g => g.type === 'regular'), [inventoryGroups]);

  const renderGroupList = (groups: InventoryGroup[], sectionType: DashboardType) => (
    <div className="flex flex-col gap-1 px-1">
      {isCreatingDashboard.active && isCreatingDashboard.type === sectionType && (
        <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg mb-1">
          <input ref={createInputRef} autoFocus type="text" placeholder="Name..." value={newDashboardName} onChange={(e) => setNewDashboardName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && finalizeCreateDashboard()} className="w-full bg-white border rounded px-2 py-1 text-xs outline-none" />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setIsCreatingDashboard({ active: false, type: 'regular' })} className="text-[10px] text-gray-500 uppercase font-bold">Cancel</button>
            <button onClick={() => finalizeCreateDashboard()} className="text-[10px] text-orange-600 uppercase font-black">Create</button>
          </div>
        </div>
      )}
      {groups.length === 0 && !isCreatingDashboard.active && (
        <div className="px-3 py-2 text-[10px] text-gray-300 italic">No items yet.</div>
      )}
      {groups.map((group, groupIdx) => (
        <div 
          key={group.id} 
          onClick={() => { setActiveGroupId(group.id); setActiveView('dashboard'); setIsSidebarOpen(false); }} 
          className={`group flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all cursor-pointer ${activeGroupId === group.id && activeView === 'dashboard' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-600 hover:bg-orange-50'}`}
        >
          <div className="flex items-center gap-2 truncate">
            <div className={`w-1.5 h-1.5 rounded-full ${activeGroupId === group.id && activeView === 'dashboard' ? 'bg-orange-600' : 'bg-gray-200'}`} />
            <span className="truncate">{group.name}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <div className="flex items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity gap-0.5">
               {groupIdx > 0 && (
                 <button onClick={(e) => moveGroup(group.id, 'up', e)} className="p-1 text-gray-400 hover:text-orange-600" title="Move Up">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                 </button>
               )}
               {groupIdx < groups.length - 1 && (
                 <button onClick={(e) => moveGroup(group.id, 'down', e)} className="p-1 text-gray-400 hover:text-orange-600" title="Move Down">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                 </button>
               )}
               <button onClick={(e) => handleRenameDashboard(group.id, e)} className="p-1 text-gray-400 hover:text-orange-600 ml-1">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
               </button>
               <button onClick={(e) => handleDeleteDashboard(group.id, e)} className="p-1 text-gray-400 hover:text-red-600">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
               </button>
            </div>
            <span className="text-[10px] bg-white border border-gray-100 px-1 rounded text-gray-400 min-w-[18px] text-center font-bold">{groupCounts[group.id] || 0}</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#fcfaf7] overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - PC Sticky & Mobile Drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-orange-100 flex flex-col
        transition-transform duration-300 md:relative md:translate-x-0 md:h-screen md:sticky md:top-0 md:z-10
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header Section */}
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between mb-4 md:mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">B</div>
              <div className="hidden md:block">
                <h1 className="text-xl font-display text-orange-950 leading-none">Bitta Spice</h1>
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-black">Admin v3.0</p>
              </div>
              <span className="md:hidden font-display text-xl text-orange-950">Bitta Spice</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-gray-400 hover:text-orange-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <nav className="flex flex-col gap-1 mt-6">
            <button onClick={() => { setActiveView('dashboard'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeView === 'dashboard' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-600 hover:bg-orange-50'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              Live Inventory
            </button>
            <button onClick={() => { setActiveView('ai-assistant'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeView === 'ai-assistant' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-600 hover:bg-orange-50'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Bitta Assistant
            </button>
            <button onClick={() => { setPendingFile(null); setActiveView('import-manager'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeView === 'import-manager' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-600 hover:bg-orange-50'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              Bulk Import
            </button>
            <button onClick={() => { setActiveView('monthly-usage'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeView === 'monthly-usage' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-600 hover:bg-orange-50'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Analytics
            </button>
          </nav>
        </div>

        {/* Scrollable Categories Section */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 scrollbar-hide">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-2 mb-1">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Storage Locations</div>
              <button onClick={() => { setIsCreatingDashboard({ active: true, type: 'factory' }); setTimeout(() => createInputRef.current?.focus(), 50); }} className="text-orange-600 text-lg font-black hover:scale-110 transition-transform">+</button>
            </div>
            {renderGroupList(factoryGroups, 'factory')}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-2 mb-1">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dashboards</div>
              <button onClick={() => { setIsCreatingDashboard({ active: true, type: 'regular' }); setTimeout(() => createInputRef.current?.focus(), 50); }} className="text-orange-600 text-lg font-black hover:scale-110 transition-transform">+</button>
            </div>
            {renderGroupList(regularGroups, 'regular')}
          </div>
        </div>

        {/* Footer / Settings Link */}
        <div className="p-4 bg-white border-t border-orange-50">
          <button 
            onClick={() => setActiveView('settings')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-orange-50 text-orange-950 hover:bg-orange-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-black text-xs">A</div>
              <span className="text-xs font-bold">Admin Profile</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#fcfaf7]">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-orange-100 sticky top-0 z-30 shadow-sm">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-black text-lg">B</div>
            <h1 className="text-lg font-display text-orange-950">Bitta Spice</h1>
          </div>
          <button onClick={() => setActiveView('ai-assistant')} className="p-2 -mr-2 text-orange-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </button>
        </div>

        {/* Content Scrolling Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <div className={`mx-auto ${activeView === 'ai-assistant' ? 'max-w-4xl h-full flex flex-col p-4 md:p-10' : 'max-w-7xl p-4 md:p-10 lg:p-12 xl:p-16'}`}>
            {activeView === 'dashboard' && (
              <div className="space-y-6 md:space-y-10 animate-fade-in">
                {/* Dashboard Title & Actions */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl md:text-5xl font-black text-orange-950 tracking-tight">{activeGroup.name}</h2>
                      <button 
                        onClick={(e) => handleRenameDashboard(activeGroup.id, e)}
                        className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 mt-2 font-medium">
                      {activeGroup.type === 'factory' ? 'Viewing combined physical floor stock' : 'Independent management channel'}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleDirectFileSelect}
                      accept=".xlsx,.xls,image/*,application/pdf"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 lg:flex-none border-2 border-orange-600 text-orange-600 px-6 py-3 rounded-2xl hover:bg-orange-50 transition-all font-black uppercase text-[10px] md:text-xs tracking-widest flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                      Upload
                    </button>
                    <button 
                      onClick={() => exportToExcel(activeGroup.items)} 
                      className="flex-1 lg:flex-none bg-orange-600 text-white px-8 py-3 rounded-2xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 font-black uppercase text-[10px] md:text-xs tracking-widest flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Excel Export
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search inventory by name, location, or supplier..." 
                    className="w-full bg-white border border-orange-100 rounded-2xl md:rounded-[1.5rem] pl-16 pr-8 py-4 md:py-6 text-sm focus:ring-4 focus:ring-orange-500/10 outline-none shadow-sm transition-all placeholder:text-gray-300" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                </div>

                {/* Main Table */}
                <div className="w-full">
                  <InventoryTable items={filteredItems} onUpdateItem={handleUpdateItem} onDeleteItem={handleDeleteItem} onAddItem={handleAddManualRow} />
                </div>
              </div>
            )}

            {activeView === 'ai-assistant' && (
              <div className="h-full animate-fade-in flex flex-col">
                 <div className="mb-6">
                    <h2 className="text-3xl font-black text-orange-950">Bitta AI Channel</h2>
                    <p className="text-sm text-gray-500">Live factory assistance for {activeGroup.name}</p>
                 </div>
                 <div className="flex-1 min-h-0">
                    <AIAgent 
                      inventory={activeGroup.items} 
                      onStockChange={handleAISync} 
                      dashboardName={activeGroup.name}
                      history={chatHistory}
                      onUpdateHistory={(msg) => setChatHistory(prev => [...prev, msg])}
                      onNavigate={setActiveView}
                      isFullScreen={true}
                    />
                 </div>
              </div>
            )}

            {activeView === 'import-manager' && <ImportManager initialFile={pendingFile} onImport={handleBulkImport} />}
            {activeView === 'settings' && <Settings profile={userProfile} onUpdateProfile={setUserProfile} chatHistory={chatHistory} activityLogs={activityLogs} />}
            {activeView === 'monthly-usage' && <MonthlyUsage activityLogs={activityLogs} />}
          </div>
        </div>
      </main>

      {/* Global Notifications */}
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl bg-orange-950 text-white shadow-2xl animate-slide-up flex items-center gap-3 border border-white/10 backdrop-blur-md">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">{notification.message}</span>
        </div>
      )}
    </div>
  );
};

export default App;
