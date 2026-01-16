
import { GoogleGenAI, Modality, Type, FunctionDeclaration, GenerateContentResponse } from '@google/genai';
import React, { useState, useRef } from 'react';
import { SpiceItem, InventoryAction, DashboardType, ChatMessage, AppView } from '../types';

// Audio Decoding Helper
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

interface AIAgentProps {
  inventory: SpiceItem[];
  dashboardName: string;
  history: ChatMessage[];
  onUpdateHistory: (msg: ChatMessage) => void;
  onStockChange: (params: any) => void;
  onNavigate: (view: AppView) => void;
  isFullScreen?: boolean;
}

const AIAgent: React.FC<AIAgentProps> = ({ inventory, dashboardName, history, onUpdateHistory, onStockChange, onNavigate, isFullScreen = false }) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isTTSActive, setIsTTSActive] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const SYSTEM_INSTRUCTION = `You are Bitta Assistant, the Supreme Commander of this Spice Factory.
    
    MULTILINGUAL CAPABILITY:
    - You fluently understand English, Hindi (हिन्दी), and Gujarati (ગુજરાતી).
    - If a user provides a command in Hindi or Gujarati, translate the intent to English internally and execute the appropriate English-named tools.
    - Always respond to the user in the SAME language they used (Hindi for Hindi, Gujarati for Gujarati, English for English).
    - Match spice names mentioned in other languages to the English inventory names (e.g., 'जीरा' or 'જીરું' matches 'Cumin').

    MANAGEMENT MANDATE:
    1. FACTORY STRUCTURE: Manage 'factory' (Storage Locations) and 'regular' (Dashboards).
    2. ARCHITECTURAL ACTIONS: CREATE, RENAME, and DELETE these channels.
    3. INVENTORY CONTROL: Track quantities, locations, and suppliers precisely.
    4. TRANSFERS: Execute atomic stock movements between locations.

    Operational Context:
    - Current Active Channel: "${dashboardName}"
    - Active Inventory Count: ${inventory.length} items.`;

  const allTools: FunctionDeclaration[] = [
    { 
      name: 'updateInventory', 
      parameters: { 
        type: Type.OBJECT, 
        properties: { 
          spiceName: { type: Type.STRING }, 
          quantity: { type: Type.NUMBER }, 
          action: { type: Type.STRING, enum: ['add', 'remove', 'set', 'create', 'delete'] }, 
          location: { type: Type.STRING },
          dashboardName: { type: Type.STRING }
        }, 
        required: ['spiceName', 'quantity', 'action'] 
      } 
    },
    {
      name: 'transferInventory',
      parameters: {
        type: Type.OBJECT,
        properties: {
          spiceName: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          fromLocation: { type: Type.STRING },
          toLocation: { type: Type.STRING }
        },
        required: ['spiceName', 'quantity', 'fromLocation', 'toLocation']
      }
    },
    { 
      name: 'createNewChannel', 
      parameters: { 
        type: Type.OBJECT, 
        properties: { 
          channelName: { type: Type.STRING, description: 'The name for the new sub-channel (e.g. Bin 14, Cold Storage).' },
          channelCategory: { type: Type.STRING, enum: ['factory', 'regular'], description: 'factory for Storage Locations, regular for Dashboards.' }
        }, 
        required: ['channelName', 'channelCategory'] 
      } 
    },
    {
      name: 'renameChannel',
      parameters: {
        type: Type.OBJECT, 
        properties: { 
          targetChannelName: { type: Type.STRING, description: 'The current name of the bin or dashboard to rename.' }, 
          newChannelName: { type: Type.STRING, description: 'The desired new name.' } 
        },
        required: ['targetChannelName', 'newChannelName']
      }
    },
    {
      name: 'deleteChannel',
      parameters: {
        type: Type.OBJECT,
        properties: { 
          targetChannelName: { type: Type.STRING, description: 'The name of the bin or dashboard to remove.' } 
        },
        required: ['targetChannelName']
      }
    },
    {
      name: 'navigateToView',
      parameters: {
        type: Type.OBJECT,
        properties: { view: { type: Type.STRING, enum: ['dashboard', 'import-manager', 'settings', 'monthly-usage', 'ai-assistant'] } },
        required: ['view']
      }
    }
  ];

  const speakText = async (text: string) => {
    if (!isTTSActive) return;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say naturally in the user's language: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const ctx = audioContextRef.current;
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const buffer = await decodeAudioData(bytes, ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
      }
    } catch (err) {
      console.error("TTS Error:", err);
    }
  };

  const handleTextSubmit = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const userMsg = customMsg || inputValue;
    if (!userMsg.trim()) return;

    if (!customMsg) setInputValue('');
    onUpdateHistory({ role: 'user', text: userMsg, timestamp: Date.now() });
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const useThinking = isThinkingMode || userMsg.length > 150;
      const model = useThinking ? 'gemini-3-pro-preview' : 'gemini-2.5-flash-lite';
      
      const config: any = {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: allTools as any }]
      };

      if (useThinking) {
        config.thinkingConfig = { thinkingBudget: 32768 };
      }

      const response = await ai.models.generateContent({
        model,
        contents: userMsg,
        config
      });

      if (response.functionCalls) {
        for (const call of response.functionCalls) {
          if (call.name === 'navigateToView') {
            onNavigate(call.args.view as AppView);
          } else {
            const actionMap: any = { 
              'transferInventory': 'transfer',
              'createNewChannel': 'createDashboard',
              'renameChannel': 'renameDashboard',
              'deleteChannel': 'deleteDashboard'
            };
            
            const mappedArgs = { ...call.args };
            if (call.name === 'createNewChannel') {
              (mappedArgs as any).dashboardName = (call.args as any).channelName;
              (mappedArgs as any).dashboardType = (call.args as any).channelCategory;
            }
            
            onStockChange({ ...mappedArgs, action: actionMap[call.name] || (call.args as any).action });
          }
        }
      }

      const replyText = response.text || "Command executed successfully.";
      onUpdateHistory({ role: 'model', text: replyText, timestamp: Date.now() });
      speakText(replyText);
    } catch (err) {
      onUpdateHistory({ role: 'model', text: "Structural error or misunderstanding. Please repeat.", timestamp: Date.now() });
    } finally {
      setIsTyping(false);
    }
  };

  const startTranscription = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          setIsTyping(true);
          try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: {
                parts: [
                  { inlineData: { data: base64Data, mimeType: 'audio/webm' } },
                  { text: "Transcribe the following command. It may be in Hindi, Gujarati, or English." }
                ]
              }
            });
            if (response.text) handleTextSubmit(undefined, response.text);
          } catch (err) {
            console.error("Transcription error:", err);
          } finally {
            setIsTyping(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access is required for transcription.");
    }
  };

  return (
    <div className={`flex flex-col bg-white border border-orange-100 rounded-3xl overflow-hidden shadow-2xl animate-slide-up ${isFullScreen ? 'h-full' : 'h-[400px]'}`}>
      <div className="p-4 border-b border-orange-50 bg-orange-50/40 flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-orange-900 text-[10px] uppercase tracking-widest">Bitta Command Center</h3>
            <div className={`w-1.5 h-1.5 rounded-full ${isThinkingMode ? 'bg-purple-500 animate-pulse' : 'bg-green-500'}`} />
          </div>
          <p className="text-[8px] text-gray-400 font-bold mt-0.5">{isThinkingMode ? 'Thinking Mode Enabled' : 'Fast Response Mode'}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsTTSActive(!isTTSActive)}
            className={`p-2 rounded-xl transition-all ${isTTSActive ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}
            title="Toggle Voice Output"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
          <button 
            onClick={() => setIsThinkingMode(!isThinkingMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${isThinkingMode ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Think
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-stone-50/50">
        {history.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-orange-200 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <p className="text-[10px] font-bold text-orange-800 uppercase tracking-widest">Awaiting Command (Hindi/Guj/Eng)</p>
          </div>
        )}
        {history.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-[1.5rem] px-5 py-3 text-sm shadow-sm ${msg.role === 'user' ? 'bg-orange-600 text-white' : 'bg-white text-gray-800 border border-orange-100'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-orange-50 border border-orange-100 rounded-full px-4 py-1.5 text-[9px] text-orange-800 font-bold">Bitta is analyzing...</div>
          </div>
        )}
      </div>

      <form onSubmit={handleTextSubmit} className="p-4 bg-white border-t border-orange-50 flex gap-2 shrink-0">
        <button 
          type="button"
          onClick={startTranscription}
          className={`p-4 rounded-2xl transition-all active:scale-90 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400 hover:text-orange-600'}`}
          title="Voice Command"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 013 3v8a3 3 0 01-3 3 3 3 0 01-3-3V5a3 3 0 013-3z" />
          </svg>
        </button>
        <input 
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Hindi, Gujarati, or English commands..."
          className="flex-1 bg-gray-50 border border-orange-50 rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
        />
        <button 
          type="submit" 
          disabled={isTyping}
          className="bg-orange-600 text-white px-6 py-4 rounded-2xl hover:bg-orange-700 transition-all active:scale-95 shadow-lg disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
        </button>
      </form>
    </div>
  );
};

export default AIAgent;
