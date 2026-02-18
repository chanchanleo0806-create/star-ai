export enum AppView {
  CHAT = 'CHAT',
  LIVE = 'LIVE',
  ART = 'ART',
  SETTINGS = 'SETTINGS'
}

export interface Attachment {
  mimeType: string;
  data: string; // base64 string
  url: string;  // blob url for preview
  name: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  groundingUrls?: Array<{ title: string; uri: string }>;
  attachments?: Attachment[];
  thinkingProcess?: string;
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