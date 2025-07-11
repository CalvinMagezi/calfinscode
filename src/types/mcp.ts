/**
 * MCP (Model Context Protocol) Type Definitions
 * 
 * Types for MCP server management and integration within Calfins Code
 */

export interface MCPServer {
  name: string;
  command: string;
  args: string[];
  type: 'stdio' | 'sse';
  status: 'connected' | 'disconnected' | 'error' | 'unknown';
  capabilities: MCPCapability[];
  description?: string;
  version?: string;
  lastConnected?: Date;
  errorMessage?: string;
}

export interface MCPCapability {
  type: 'resources' | 'tools' | 'prompts';
  name: string;
  description?: string;
}

export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  type: 'stdio' | 'sse';
  description?: string;
  autoStart?: boolean;
  env?: Record<string, string>;
}

export interface MCPServerStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'error' | 'unknown';
  lastConnected?: Date;
  errorMessage?: string;
  capabilities?: MCPCapability[];
}

export interface MCPServerTemplate {
  id: string;
  name: string;
  description: string;
  command: string;
  args: string[];
  type: 'stdio' | 'sse';
  category: 'database' | 'filesystem' | 'web' | 'ai' | 'development' | 'other';
  requiresSetup?: boolean;
  setupInstructions?: string;
  env?: Record<string, string>;
}

export interface MCPAddServerRequest {
  name: string;
  command: string;
  args: string[];
  type: 'stdio' | 'sse';
  description?: string;
  autoStart?: boolean;
  env?: Record<string, string>;
}

export interface MCPRemoveServerRequest {
  name: string;
  force?: boolean;
}

export interface MCPListResponse {
  servers: MCPServer[];
  total: number;
}

export interface MCPServerDetails {
  name: string;
  command: string;
  args: string[];
  type: 'stdio' | 'sse';
  status: 'connected' | 'disconnected' | 'error' | 'unknown';
  capabilities: MCPCapability[];
  description?: string;
  version?: string;
  lastConnected?: Date;
  errorMessage?: string;
  env?: Record<string, string>;
  pid?: number;
  uptime?: number;
}

// WebSocket message types for MCP
export interface MCPWebSocketMessage {
  type: 'mcp-server-status' | 'mcp-server-added' | 'mcp-server-removed' | 'mcp-server-error' | 'mcp-servers-updated';
  data: MCPServerStatus | MCPServer | MCPServer[] | { name: string; error: string };
}

export interface MCPSettings {
  autoStartServers: boolean;
  checkInterval: number; // in seconds
  maxRetries: number;
  retryDelay: number; // in milliseconds
  debugMode: boolean;
  globalServers: string[]; // server names that are available globally
  projectServers: string[]; // server names that are project-specific
}

export interface MCPHealth {
  healthy: boolean;
  totalServers: number;
  connectedServers: number;
  disconnectedServers: number;
  errorServers: number;
  lastCheck: Date;
}

export interface MCPLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  server: string;
  message: string;
  details?: any;
}

// Integration with existing WebSocket types
export interface MCPWebSocketMessageUnion {
  type: 'mcp-server-status' | 'mcp-server-added' | 'mcp-server-removed' | 'mcp-server-error' | 'mcp-servers-updated';
  data: any;
  timestamp?: string;
}