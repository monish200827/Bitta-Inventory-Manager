
export interface SpiceItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  supplier: string;
  lastUpdated: string;
  source?: 'Manual' | 'Excel' | 'AI-OCR';
}

export type DashboardType = 'factory' | 'regular';

export interface InventoryGroup {
  id: string;
  name: string;
  createdAt: string;
  items: SpiceItem[];
  type: DashboardType;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  type: 'stock' | 'system' | 'ai';
  metadata?: {
    spiceName?: string;
    amount?: number;
    isUsage?: boolean;
    fromLocation?: string;
    toLocation?: string;
  };
}

export interface UserProfile {
  email: string;
  mobile: string;
}

export type InventoryAction = 'add' | 'remove' | 'set' | 'create' | 'delete' | 'transfer' | 'createDashboard' | 'renameDashboard' | 'deleteDashboard';
export type AppView = 'dashboard' | 'import-manager' | 'settings' | 'monthly-usage' | 'ai-assistant';
