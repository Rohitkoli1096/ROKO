
export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'system' | 'user' | 'ai' | 'error' | 'command';
  message: string;
}

export interface UserMemory {
  preferences: Record<string, any>;
  notes: string[];
  context: string;
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}
