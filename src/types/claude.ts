export interface ClaudeResponse {
  session_id?: string;
  type: 'message' | 'tool_use' | 'tool_result' | 'error' | 'thinking';
  content?: string;
  tool_name?: string;
  tool_input?: Record<string, any>;
  tool_result?: any;
  error?: string;
  thinking?: string;
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

export interface ClaudeMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'tool_use' | 'tool_result' | 'thinking';
  content: string;
  timestamp: string;
  toolName?: string;
  toolInput?: Record<string, any>;
  toolResult?: any;
  isExpanded?: boolean;
  isStreaming?: boolean;
  error?: string;
  thinking?: string;
}

export interface ClaudeSession {
  id: string;
  title: string;
  messages: ClaudeMessage[];
  projectPath?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  toolsEnabled: boolean;
}

export interface ClaudeSettings {
  toolsEnabled: boolean;
  allowedTools: string[];
  disallowedTools: string[];
  skipPermissions: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeState {
  currentSession: ClaudeSession | null;
  sessions: ClaudeSession[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  settings: ClaudeSettings;
}

export interface ToolExpansionState {
  [messageId: string]: boolean;
}

export interface MessageStreamingState {
  isStreaming: boolean;
  currentMessageId: string | null;
  streamingContent: string;
}

export interface ClaudeVersionInfo {
  version: string;
  latestVersion: string;
  hasUpdate: boolean;
  updateUrl?: string;
}