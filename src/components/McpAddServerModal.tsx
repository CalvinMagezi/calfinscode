/**
 * McpAddServerModal.tsx - Modal for adding new MCP servers
 * 
 * Provides a form interface for configuring and adding new MCP servers
 */

import React, { useState } from 'react';
import { X, Server, Plus, AlertCircle, HelpCircle } from 'lucide-react';
import { MCPAddServerRequest, MCPServerTemplate } from '../types/mcp';

interface McpAddServerModalProps {
  onClose: () => void;
  onAdd: (server: MCPAddServerRequest) => Promise<void>;
}

// Pre-defined server templates for common MCP servers
const SERVER_TEMPLATES: MCPServerTemplate[] = [
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'Access local files and directories',
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem', '/path/to/directory'],
    type: 'stdio',
    category: 'filesystem',
    requiresSetup: true,
    setupInstructions: 'Replace /path/to/directory with the actual path you want to access'
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Connect to PostgreSQL databases',
    command: 'npx',
    args: ['@modelcontextprotocol/server-postgres', 'postgresql://user:password@localhost/dbname'],
    type: 'stdio',
    category: 'database',
    requiresSetup: true,
    setupInstructions: 'Replace connection string with your actual PostgreSQL credentials'
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Access GitHub repositories and issues',
    command: 'npx',
    args: ['@modelcontextprotocol/server-github'],
    type: 'stdio',
    category: 'development',
    requiresSetup: true,
    setupInstructions: 'Requires GITHUB_PERSONAL_ACCESS_TOKEN environment variable',
    env: {
      'GITHUB_PERSONAL_ACCESS_TOKEN': ''
    }
  },
  {
    id: 'git',
    name: 'Git',
    description: 'Git operations and repository management',
    command: 'npx',
    args: ['@modelcontextprotocol/server-git'],
    type: 'stdio',
    category: 'development'
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    description: 'Web scraping and browser automation',
    command: 'npx',
    args: ['@modelcontextprotocol/server-puppeteer'],
    type: 'stdio',
    category: 'web'
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Web search capabilities via Brave Search API (available in all projects)',
    command: 'npx',
    args: ['@modelcontextprotocol/server-brave-search'],
    type: 'stdio',
    category: 'web',
    requiresSetup: true,
    setupInstructions: 'Requires BRAVE_API_KEY environment variable. Get your API key from https://api.search.brave.com/',
    env: {
      'BRAVE_API_KEY': ''
    }
  }
];

const McpAddServerModal: React.FC<McpAddServerModalProps> = ({ onClose, onAdd }) => {
  const [formMode, setFormMode] = useState<'template' | 'custom'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<MCPServerTemplate | null>(null);
  const [formData, setFormData] = useState<MCPAddServerRequest>({
    name: '',
    command: '',
    args: [],
    type: 'stdio',
    description: '',
    env: {}
  });
  const [envVars, setEnvVars] = useState<Array<{key: string; value: string}>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTemplateSelect = (template: MCPServerTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name.toLowerCase().replace(/\s+/g, '-'),
      command: template.command,
      args: [...template.args],
      type: template.type,
      description: template.description,
      env: template.env || {}
    });
    
    // Convert env object to array for editing
    const envArray = Object.entries(template.env || {}).map(([key, value]) => ({ key, value }));
    setEnvVars(envArray);
  };

  const handleFormChange = (field: keyof MCPAddServerRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArgsChange = (value: string) => {
    const args = value.split(' ').filter(arg => arg.trim() !== '');
    setFormData(prev => ({
      ...prev,
      args
    }));
  };

  const addEnvVar = () => {
    setEnvVars(prev => [...prev, { key: '', value: '' }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(prev => prev.filter((_, i) => i !== index));
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    setEnvVars(prev => prev.map((env, i) => 
      i === index ? { ...env, [field]: value } : env
    ));
  };

  // Update form data when env vars change
  const updateFormDataEnv = () => {
    const envObj = envVars.reduce((acc, { key, value }) => {
      if (key.trim() && value.trim()) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {} as Record<string, string>);
    
    setFormData(prev => ({
      ...prev,
      env: envObj
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Server name is required';
    }
    
    if (!formData.command.trim()) {
      return 'Command is required';
    }
    
    // Check for valid server name (no spaces, special chars)
    if (!/^[a-zA-Z0-9_-]+$/.test(formData.name)) {
      return 'Server name can only contain letters, numbers, hyphens, and underscores';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update form data with current env vars
    updateFormDataEnv();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Create final form data with env vars
      const finalFormData = {
        ...formData,
        env: envVars.reduce((acc, { key, value }) => {
          if (key.trim() && value.trim()) {
            acc[key.trim()] = value.trim();
          }
          return acc;
        }, {} as Record<string, string>)
      };
      
      await onAdd(finalFormData);
      // Modal will be closed by parent component on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Add MCP Server
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode selector */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-4">
            <button
              onClick={() => setFormMode('template')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                formMode === 'template'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Use Template
            </button>
            <button
              onClick={() => setFormMode('custom')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                formMode === 'custom'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Custom Configuration
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {formMode === 'template' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Choose a Template
              </h3>
              
              <div className="grid gap-3">
                {SERVER_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`text-left p-4 border rounded-lg transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {template.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {template.description}
                        </p>
                        <span className="inline-block mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400 rounded">
                          {template.category}
                        </span>
                      </div>
                      {template.requiresSetup && (
                        <HelpCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              {selectedTemplate?.requiresSetup && (
                <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                  <div className="flex items-start">
                    <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        Setup Required
                      </h4>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                        {selectedTemplate.setupInstructions}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Form (shown for both modes when template is selected or custom mode) */}
          {(formMode === 'custom' || selectedTemplate) && (
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              {/* Server Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Server Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="my-mcp-server"
                />
              </div>

              {/* Command */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Command *
                </label>
                <input
                  type="text"
                  value={formData.command}
                  onChange={(e) => handleFormChange('command', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="npx"
                />
              </div>

              {/* Arguments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Arguments
                </label>
                <input
                  type="text"
                  value={formData.args.join(' ')}
                  onChange={(e) => handleArgsChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="@modelcontextprotocol/server-filesystem /path/to/directory"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleFormChange('type', e.target.value as 'stdio' | 'sse')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="stdio">STDIO</option>
                  <option value="sse">Server-Sent Events</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description for this server"
                />
              </div>

              {/* Environment Variables */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Environment Variables
                  </label>
                  <button
                    type="button"
                    onClick={addEnvVar}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Variable
                  </button>
                </div>
                
                {envVars.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                    No environment variables configured
                  </div>
                ) : (
                  <div className="space-y-2">
                    {envVars.map((envVar, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={envVar.key}
                          onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Variable name (e.g., BRAVE_API_KEY)"
                        />
                        <input
                          type="text"
                          value={envVar.value}
                          onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Value"
                        />
                        <button
                          type="button"
                          onClick={() => removeEnvVar(index)}
                          className="px-2 py-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedTemplate?.requiresSetup && selectedTemplate.env && (
                  <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                    This template requires environment variables to be configured
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                    <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Server
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default McpAddServerModal;