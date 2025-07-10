export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface FileTreeItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeItem[];
  size?: number;
  modified?: string;
}

export interface GitOperation {
  type: 'status' | 'commit' | 'push' | 'pull' | 'branch' | 'log' | 'diff';
  result: string;
  error?: string;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  conflicted: string[];
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface FileReadRequest {
  path: string;
  encoding?: string;
}

export interface FileWriteRequest {
  path: string;
  content: string;
  encoding?: string;
}

export interface ProjectDiscoveryResult {
  projects: Project[];
  error?: string;
}

export interface ClaudeProcessInfo {
  id: string;
  pid: number;
  command: string;
  startTime: string;
  isActive: boolean;
  sessionId?: string;
  projectPath?: string;
}

export interface WebSocketClient {
  id: string;
  ip: string;
  userAgent: string;
  connectedAt: string;
  lastActivity: string;
}

export interface ServerStatus {
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  activeConnections: number;
  activeProcesses: number;
  version: string;
}

export interface TerminalSession {
  id: string;
  pid: number;
  cwd: string;
  shell: string;
  isActive: boolean;
  createdAt: string;
  lastActivity: string;
}

export interface Project {
  name: string;
  displayName: string;
  fullPath: string;
  sessionMeta: SessionMeta;
  sessions: Session[];
}

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface SessionMeta {
  total: number;
  hasMore: boolean;
}

export interface ClaudeCommandOptions {
  sessionId?: string;
  projectPath?: string;
  cwd?: string;
  resume?: boolean;
  toolsSettings?: ToolsSettings;
}

export interface ToolsSettings {
  allowedTools: string[];
  disallowedTools: string[];
  skipPermissions: boolean;
}

export interface WebSocketMessagePayload {
  type: string;
  data?: any;
  timestamp: string;
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
}