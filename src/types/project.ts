export interface Project {
  name: string;
  displayName: string;
  fullPath: string;
  path?: string; // Optional for backwards compatibility
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

export interface FileTreeItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeItem[];
  size?: number;
  modified?: string;
}

export interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  currentSession: Session | null;
  isLoading: boolean;
  error: string | null;
}

export interface SessionProtection {
  isSessionActive: boolean;
  sessionId: string | null;
  protectedProjects: Set<string>;
}

export interface FileContent {
  path: string;
  content: string;
  language: string;
  isReadOnly: boolean;
  lastModified: string;
}