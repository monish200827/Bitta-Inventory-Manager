
import { SpiceItem } from './types';

export const INITIAL_INVENTORY: SpiceItem[] = [
  { id: '1', name: 'Cumin Seeds', category: 'Seed', quantity: 150, unit: 'kg', location: 'Warehouse A - Bin 4', supplier: 'Spice Garden Exports', lastUpdated: new Date().toISOString() },
  { id: '2', name: 'Turmeric Powder', category: 'Ground', quantity: 300, unit: 'kg', location: 'Warehouse B - Cold Storage', supplier: 'Organic Roots Co.', lastUpdated: new Date().toISOString() },
  { id: '3', name: 'Black Peppercorns', category: 'Whole', quantity: 85, unit: 'kg', location: 'Warehouse A - Bin 12', supplier: 'Vietnam Peppers Ltd.', lastUpdated: new Date().toISOString() },
  { id: '4', name: 'Smoked Paprika', category: 'Ground', quantity: 45, unit: 'kg', location: 'Shelf 2 - Processing', supplier: 'Spanish Spices S.A.', lastUpdated: new Date().toISOString() },
  { id: '5', name: 'Cardamom Pods', category: 'Whole', quantity: 12, unit: 'kg', location: 'Secure Vault 1', supplier: 'Royal Kerala Spices', lastUpdated: new Date().toISOString() },
  { id: '6', name: 'Garam Masala', category: 'Blend', quantity: 200, unit: 'kg', location: 'Warehouse B - Bin 8', supplier: 'In-House Blend Div', lastUpdated: new Date().toISOString() },
  { id: '7', name: 'Dried Oregano', category: 'Herb', quantity: 30, unit: 'kg', location: 'Shelf 4 - Processing', supplier: 'Mediterranean Herbs', lastUpdated: new Date().toISOString() },
];

export const CATEGORIES = ['Seed', 'Ground', 'Whole', 'Blend', 'Herb'] as const;
export const UNITS = ['kg', 'g', 'bags', 'lbs'] as const;
