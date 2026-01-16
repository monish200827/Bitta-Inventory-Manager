
import * as XLSX from 'xlsx';
import { SpiceItem } from '../types';

export const exportToExcel = (data: SpiceItem[]) => {
  const worksheet = XLSX.utils.json_to_sheet(data.map(item => ({
    'ID': item.id,
    'Spice Name': item.name,
    'Category': item.category,
    'Quantity': item.quantity,
    'Unit': item.unit,
    'Location': item.location,
    'Supplier': item.supplier,
    'Last Updated': new Date(item.lastUpdated).toLocaleString(),
    'Source': item.source || 'Manual'
  })));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
  XLSX.writeFile(workbook, `Spice_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const importFromExcel = async (file: File): Promise<Partial<SpiceItem>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const mappedData: Partial<SpiceItem>[] = jsonData.map((row: any) => ({
          name: row['Spice Name'] || row['name'] || 'Unknown Spice',
          category: (row['Category'] || row['category'] || 'Whole') as string,
          quantity: parseFloat(row['Quantity'] || row['quantity'] || 0),
          unit: (row['Unit'] || row['unit'] || 'kg') as string,
          location: (row['Location'] || row['location'] || 'N/A') as string,
          supplier: (row['Supplier'] || row['supplier'] || 'Unknown') as string,
          source: 'Excel',
          lastUpdated: new Date().toISOString()
        }));

        resolve(mappedData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    // Fixed typo: was 're nader'
    reader.readAsArrayBuffer(file);
  });
};
