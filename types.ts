
export enum AppView {
  CHAT = 'CHAT',
  LIVE = 'LIVE',
  ART = 'ART',
  SETTINGS = 'SETTINGS'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  groundingUrls?: Array<{ title: string; uri: string }>;
  isThinking?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdate: number;
}

export interface ImageGeneration {
  id: string;
  prompt: string;
  imageUrl: string;
  timestamp: number;
}
