
import React, { useState, useEffect } from 'react';
import { importFromExcel } from '../utils/excelUtils';
import { SpiceItem } from '../types';
import { GoogleGenAI, Type } from '@google/genai';

interface ImportManagerProps {
  onImport: (name: string, items: Partial<SpiceItem>[]) => void;
  initialFile?: File | null;
}

const ImportManager: React.FC<ImportManagerProps> = ({ onImport, initialFile }) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<Partial<SpiceItem>[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [dashboardName, setDashboardName] = useState('');

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const processWithAI = async (file: File) => {
    setLoading(true);
    setLoadingStatus('Strict literal extraction in progress...');
    try {
      const base64Data = await fileToBase64(file);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: file.type,
                },
              },
              {
                text: `STRICT LITERAL EXTRACTION MODE: 
                Your task is to convert this image/document into a digital spreadsheet without making ANY changes to the content. 
                1. DO NOT normalize names. If it says "Cumin (A-Grade)", keep it exactly as "Cumin (A-Grade)".
                2. DO NOT adjust quantities or round numbers. If it says "12.75", extract "12.75".
                3. DO NOT change units. Keep them exactly as written in the source.
                4. Extract "Location" or "Place" if mentioned. If not found, use "Unassigned".
                5. Extract "Supplier", "From", or "Origin" if mentioned. If not found, use "Unknown".
                6. Maintain the row structure exactly as it appears. 
                7. If a category is mentioned (e.g., Seed, Ground, Herb), use that exact string. If no category exists, look for common patterns or leave it blank.
                
                Return a JSON array of objects with keys: 'name', 'quantity', 'unit', 'category', 'location', and 'supplier'.`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Literal name from the document" },
                quantity: { type: Type.NUMBER, description: "Exact number found" },
                unit: { type: Type.STRING, description: "Literal unit text" },
                category: { type: Type.STRING, description: "Literal category or blank" },
                location: { type: Type.STRING, description: "Literal location/place where stock is" },
                supplier: { type: Type.STRING, description: "Literal supplier/from whom stock came" },
              },
              required: ["name", "quantity", "unit", "category", "location", "supplier"],
            },
          },
        },
      });

      const extractedData = JSON.parse(response.text || '[]');
      const formattedData = extractedData.map((item: any) => ({
        ...item,
        source: 'AI-OCR' as const,
        lastUpdated: new Date().toISOString()
      }));
      
      setPreview(formattedData);
      setDashboardName(`Literal Import: ${file.name.split('.')[0]}`);
    } catch (err) {
      console.error(err);
      alert("Literal extraction failed. Please ensure the image is clear.");
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  const handleFile = async (file: File) => {
    if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      setLoading(true);
      setLoadingStatus('Parsing original Excel columns...');
      try {
        const data = await importFromExcel(file);
        setPreview(data);
        setDashboardName(file.name.split('.')[0]);
      } catch (err) {
        alert("Error parsing Excel file.");
      } finally {
        setLoading(false);
        setLoadingStatus('');
      }
    } else if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      await processWithAI(file);
    } else {
      alert("Unsupported format. Use Excel, JPG, PNG, or PDF.");
    }
  };

  useEffect(() => {
    if (initialFile) {
      handleFile(initialFile);
    }
  }, [initialFile]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const confirmImport = () => {
    if (!dashboardName.trim()) {
      alert("Please enter a name for this literal inventory dashboard.");
      return;
    }
    onImport(dashboardName, preview);
    setPreview([]);
    setDashboardName('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className={`bg-white p-10 rounded-[2.5rem] border-2 border-dashed transition-all text-center ${dragActive ? 'border-orange-500 bg-orange-50' : 'border-orange-200 hover:border-orange-400'}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <div className={`py-12 flex flex-col items-center gap-6 ${dragActive ? 'scale-105' : ''} transition-transform`}>
          <div className="flex gap-4">
            <div className="p-5 bg-orange-100 rounded-3xl text-orange-600 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="p-5 bg-green-100 rounded-3xl text-green-600 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">1:1 Digital Twin Import</h3>
            <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
              Drop an image or file. Gemini AI will extract the data exactly as written, including Location and Supplier info.
            </p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            id="smart-upload" 
            accept=".xlsx,.xls,image/*,application/pdf" 
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <label 
            htmlFor="smart-upload"
            className="mt-4 px-10 py-4 bg-orange-600 text-white rounded-2xl font-bold shadow-xl hover:bg-orange-700 cursor-pointer transition-all active:scale-95 flex items-center gap-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Select Document
          </label>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-5 animate-pulse">
          <div className="w-14 h-14 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin"></div>
          <div className="text-orange-950 font-bold text-xl">{loadingStatus}</div>
          <p className="text-gray-400 text-sm italic">Ensuring no data is modified during extraction...</p>
        </div>
      )}

      {preview.length > 0 && (
        <div className="bg-white rounded-[2rem] shadow-2xl border border-orange-100 overflow-hidden animate-slide-up">
          <div className="p-8 bg-orange-50/50 flex flex-col lg:flex-row justify-between items-center gap-6 border-b border-orange-100">
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-black text-orange-800 uppercase tracking-[0.2em] mb-2">New Dashboard Identity</label>
              <input 
                type="text" 
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                placeholder="Name your literal dashboard..."
                className="w-full bg-white border border-orange-200 rounded-2xl px-5 py-3 text-base font-bold text-orange-950 focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
              />
            </div>
            <div className="flex gap-4 shrink-0 w-full lg:w-auto">
              <button 
                onClick={() => setPreview([])}
                className="flex-1 lg:flex-none px-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={confirmImport}
                className="flex-1 lg:flex-none px-8 py-3 bg-orange-600 text-white text-sm font-black rounded-xl hover:bg-orange-700 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Confirm Literal Import
              </button>
            </div>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-orange-50">
              <thead className="bg-gray-50/50 sticky top-0 backdrop-blur-sm">
                <tr>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Extracted Item Name</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantity</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((item, idx) => (
                  <tr key={idx} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-8 py-5 text-sm font-bold text-gray-900 italic">{item.name}</td>
                    <td className="px-8 py-5 text-sm font-mono font-bold text-gray-700">{item.quantity}</td>
                    <td className="px-8 py-5 text-sm font-semibold text-stone-600">{item.location}</td>
                    <td className="px-8 py-5 text-sm font-semibold text-stone-600">{item.supplier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportManager;
