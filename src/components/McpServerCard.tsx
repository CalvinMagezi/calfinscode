/**
 * McpServerCard.tsx - Individual MCP Server Status Card
 * 
 * Displays status and controls for a single MCP server
 */

import React, { useState } from 'react';
import { 
  Server, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  MoreVertical, 
  Trash2, 
  RefreshCw, 
  Terminal,
  Settings,
  Play,
  Square
} from 'lucide-react';
import { MCPServer } from '../types/mcp';

interface McpServerCardProps {
  server: MCPServer;
  onRemove: (name: string) => Promise<void>;
  onRestart: (name: string) => Promise<void>;
}

const McpServerCard: React.FC<McpServerCardProps> = ({ server, onRemove, onRestart }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (server.status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'disconnected':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Server className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (server.status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (server.status) {
      case 'connected':
        return 'text-green-600 dark:text-green-400';
      case 'disconnected':
        return 'text-gray-500 dark:text-gray-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  const handleRemove = async () => {
    if (!confirm(`Are you sure you want to remove the "${server.name}" MCP server?`)) {
      return;
    }
    
    setLoading(true);
    try {
      await onRemove(server.name);
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  const handleRestart = async () => {
    setLoading(true);
    try {
      await onRestart(server.name);
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">{server.name}</h4>
            <p className={`text-sm ${getStatusColor()}`}>{getStatusText()}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {server.capabilities && server.capabilities.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {server.capabilities.length} capabilities
            </div>
          )}
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <MoreVertical className="w-4 h-4" />
              )}
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {expanded ? 'Hide Details' : 'Show Details'}
                  </button>
                  
                  <button
                    onClick={handleRestart}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Restart
                  </button>
                  
                  <button
                    onClick={handleRemove}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {server.status === 'error' && server.errorMessage && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
          {server.errorMessage}
        </div>
      )}

      {/* Description */}
      {server.description && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {server.description}
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            {/* Command */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Command
              </label>
              <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 font-mono text-sm text-gray-800 dark:text-gray-200">
                {server.command} {server.args.join(' ')}
              </div>
            </div>
            
            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Type
              </label>
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-medium rounded">
                {server.type.toUpperCase()}
              </span>
            </div>
            
            {/* Capabilities */}
            {server.capabilities && server.capabilities.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Capabilities
                </label>
                <div className="flex flex-wrap gap-1">
                  {server.capabilities.map((capability, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-medium rounded"
                    >
                      {capability.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Version */}
            {server.version && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Version
                </label>
                <span className="text-sm text-gray-700 dark:text-gray-300">{server.version}</span>
              </div>
            )}
            
            {/* Last Connected */}
            {server.lastConnected && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Last Connected
                </label>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {new Date(server.lastConnected).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default McpServerCard;