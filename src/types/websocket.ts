// Import types from other files to avoid duplication
import { 
  Project, 
  Session, 
  SessionMeta, 
  FileTreeItem 
} from './project';

import { 
  ClaudeCommandOptions, 
  ClaudeResponse, 
  ToolsSettings 
} from './claude';

import {
  MCPServer,
  MCPServerStatus,
  MCPHealth
} from './mcp';

export interface WebSocketMessage {
  type: 'claude-command' | 'abort-session' | 'projects_updated' | 'claude-response' | 'claude-complete' | 'session-created' | 'session-aborted' | 'file-tree-updated' | 'terminal-output' | 'terminal-input' | 'claude-status' | 'mcp-server-status' | 'mcp-server-added' | 'mcp-server-removed' | 'mcp-server-error' | 'mcp-servers-updated' | 'mcp-health-updated';
  timestamp?: string;
}

export interface ClaudeCommandMessage extends WebSocketMessage {
  type: 'claude-command';
  command: string;
  options?: ClaudeCommandOptions;
}

export interface ClaudeResponseMessage extends WebSocketMessage {
  type: 'claude-response';
  data: ClaudeResponse;
}

export interface ClaudeCompleteMessage extends WebSocketMessage {
  type: 'claude-complete';
  sessionId: string;
}

export interface ProjectsUpdatedMessage extends WebSocketMessage {
  type: 'projects_updated';
  projects: Project[];
  changeType: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  changedFile: string;
}

export interface SessionCreatedMessage extends WebSocketMessage {
  type: 'session-created';
  sessionId: string;
}

export interface SessionAbortedMessage extends WebSocketMessage {
  type: 'session-aborted';
  sessionId: string;
}

export interface FileTreeUpdatedMessage extends WebSocketMessage {
  type: 'file-tree-updated';
  path: string;
  tree: FileTreeItem[];
}

export interface TerminalOutputMessage extends WebSocketMessage {
  type: 'terminal-output';
  data: string;
}

export interface TerminalInputMessage extends WebSocketMessage {
  type: 'terminal-input';
  data: string;
}

export interface AbortSessionMessage extends WebSocketMessage {
  type: 'abort-session';
  sessionId: string;
}

export interface ClaudeStatusMessage extends WebSocketMessage {
  type: 'claude-status';
  data: any;
}

// MCP WebSocket Messages
export interface MCPServerStatusMessage extends WebSocketMessage {
  type: 'mcp-server-status';
  server: MCPServerStatus;
}

export interface MCPServerAddedMessage extends WebSocketMessage {
  type: 'mcp-server-added';
  server: MCPServer;
}

export interface MCPServerRemovedMessage extends WebSocketMessage {
  type: 'mcp-server-removed';
  serverName: string;
}

export interface MCPServerErrorMessage extends WebSocketMessage {
  type: 'mcp-server-error';
  serverName: string;
  error: string;
}

export interface MCPServersUpdatedMessage extends WebSocketMessage {
  type: 'mcp-servers-updated';
  servers: MCPServer[];
}

export interface MCPHealthUpdatedMessage extends WebSocketMessage {
  type: 'mcp-health-updated';
  health: MCPHealth;
}

export type WebSocketMessageUnion = 
  | ClaudeCommandMessage
  | ClaudeResponseMessage
  | ClaudeCompleteMessage
  | ProjectsUpdatedMessage
  | SessionCreatedMessage
  | SessionAbortedMessage
  | FileTreeUpdatedMessage
  | TerminalOutputMessage
  | TerminalInputMessage
  | AbortSessionMessage
  | ClaudeStatusMessage
  | MCPServerStatusMessage
  | MCPServerAddedMessage
  | MCPServerRemovedMessage
  | MCPServerErrorMessage
  | MCPServersUpdatedMessage
  | MCPHealthUpdatedMessage;