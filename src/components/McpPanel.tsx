/**
 * McpPanel.tsx - MCP Server Management Panel
 * 
 * Provides interface for managing Model Context Protocol servers
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Server, AlertCircle, CheckCircle, XCircle, RefreshCw, Settings } from 'lucide-react';
import { MCPServer, MCPListResponse, MCPHealth, MCPAddServerRequest } from '../types/mcp';
import McpServerCard from './McpServerCard';
import McpAddServerModal from './McpAddServerModal';

interface McpPanelProps {
  className?: string;
}

const McpPanel: React.FC<McpPanelProps> = ({ className = '' }) => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [health, setHealth] = useState<MCPHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch MCP servers from API
  const fetchServers = useCallback(async () => {
    try {
      const response = await fetch('/api/mcp/servers');
      if (!response.ok) {
        // If the endpoint doesn't exist yet, just set empty servers
        if (response.status === 404) {
          setServers([]);
          setError(null);
          return;
        }
        throw new Error(`Failed to fetch servers: ${response.statusText}`);
      }
      const data: MCPListResponse = await response.json();
      setServers(data.servers || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching MCP servers:', err);
      // For development, if the API isn't available yet, just show empty state
      if (err instanceof TypeError || (err instanceof Error && err.message.includes('Failed to fetch'))) {
        setServers([]);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch servers');
      }
    }
  }, []);

  // Fetch MCP health status
  const fetchHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/mcp/health');
      if (!response.ok) {
        // If the endpoint doesn't exist yet, set default health
        if (response.status === 404) {
          setHealth({
            healthy: true,
            totalServers: 0,
            connectedServers: 0,
            disconnectedServers: 0,
            errorServers: 0,
            lastCheck: new Date()
          });
          return;
        }
        throw new Error(`Failed to fetch health: ${response.statusText}`);
      }
      const healthData: MCPHealth = await response.json();
      setHealth(healthData);
    } catch (err) {
      console.error('Error fetching MCP health:', err);
      // For development, if the API isn't available yet, just set default health
      if (err instanceof TypeError || (err instanceof Error && err.message.includes('Failed to fetch'))) {
        setHealth({
          healthy: true,
          totalServers: 0,
          connectedServers: 0,
          disconnectedServers: 0,
          errorServers: 0,
          lastCheck: new Date()
        });
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchServers(), fetchHealth()]);
      setLoading(false);
    };
    
    loadData();
  }, [fetchServers, fetchHealth]);

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchServers(), fetchHealth()]);
    setRefreshing(false);
  };

  // Add new server
  const handleAddServer = async (serverConfig: MCPAddServerRequest) => {
    try {
      const response = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serverConfig),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add server');
      }

      await fetchServers();
      await fetchHealth();
      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding server:', err);
      throw err; // Re-throw to let modal handle the error
    }
  };

  // Remove server
  const handleRemoveServer = async (name: string) => {
    try {
      const response = await fetch(`/api/mcp/servers/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove server');
      }

      await fetchServers();
      await fetchHealth();
    } catch (err) {
      console.error('Error removing server:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove server');
    }
  };

  // Restart server
  const handleRestartServer = async (name: string) => {
    try {
      const response = await fetch(`/api/mcp/servers/${encodeURIComponent(name)}/restart`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restart server');
      }

      await fetchServers();
      await fetchHealth();
    } catch (err) {
      console.error('Error restarting server:', err);
      setError(err instanceof Error ? err.message : 'Failed to restart server');
    }
  };

  const getHealthIcon = () => {
    if (!health) return <Server className="w-4 h-4 text-gray-400" />;
    
    if (health.healthy) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (health.errorServers > 0) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getHealthText = () => {
    if (!health) return 'Loading...';
    
    if (health.totalServers === 0) {
      return 'No servers configured';
    }
    
    return `${health.connectedServers}/${health.totalServers} connected`;
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Server className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">MCP Servers</h3>
          </div>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading servers...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">MCP Servers</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
              title="Refresh servers"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              title="Add MCP server"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Health status */}
        <div className="mt-2 flex items-center space-x-2 text-sm">
          {getHealthIcon()}
          <span className="text-gray-600 dark:text-gray-400">{getHealthText()}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
            </div>
          </div>
        )}

        {servers.length === 0 ? (
          <div className="text-center py-8">
            <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No MCP servers configured</h4>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Add MCP servers to extend Claude's capabilities with external tools and data sources.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Server
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {servers.map((server) => (
              <McpServerCard
                key={server.name}
                server={server}
                onRemove={handleRemoveServer}
                onRestart={handleRestartServer}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Server Modal */}
      {showAddModal && (
        <McpAddServerModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddServer}
        />
      )}
    </div>
  );
};

export default McpPanel;