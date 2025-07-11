/**
 * MCP (Model Context Protocol) API Routes
 * 
 * Provides REST API endpoints for managing MCP servers by wrapping Claude CLI commands
 */

const express = require('express');
const { spawn } = require('child_process');
const router = express.Router();

// Helper function to execute Claude MCP commands
function executeClaudeMCPCommand(args) {
  return new Promise((resolve, reject) => {
    console.log('🔧 Executing Claude MCP command:', 'claude mcp', args.join(' '));
    console.log('🔧 Spawn args array:', ['claude', 'mcp', ...args]);
    
    const childProcess = spawn('claude', ['mcp', ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });
    
    let stdout = '';
    let stderr = '';
    
    childProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        try {
          // Try to parse JSON output, fallback to plain text
          const result = stdout.trim() ? JSON.parse(stdout) : { success: true };
          resolve(result);
        } catch (parseError) {
          // If not JSON, return as plain text
          resolve({ output: stdout.trim(), success: true });
        }
      } else {
        reject(new Error(stderr || `Command exited with code ${code}`));
      }
    });
    
    childProcess.on('error', (error) => {
      reject(error);
    });
  });
}

// Helper function to parse MCP server info from Claude CLI output
function parseServerInfo(serverData, rawOutput = null) {
  // If we have raw output from `claude mcp list`, parse it
  if (typeof serverData === 'string' && rawOutput) {
    // Parse format: "server-name: command args"
    const parts = serverData.split(': ');
    if (parts.length >= 2) {
      const name = parts[0];
      const commandLine = parts[1];
      const commandParts = commandLine.split(' ');
      const command = commandParts[0];
      const args = commandParts.slice(1);
      
      return {
        name,
        command,
        args,
        type: 'stdio',
        status: 'connected', // Assume connected if listed
        capabilities: [],
        description: `MCP server: ${name}`,
        version: undefined,
        lastConnected: new Date(),
        errorMessage: undefined
      };
    }
  }
  
  // Claude CLI returns various formats, normalize to our interface
  if (typeof serverData === 'string') {
    return {
      name: serverData,
      command: '',
      args: [],
      type: 'stdio',
      status: 'unknown',
      capabilities: []
    };
  }
  
  return {
    name: serverData.name || 'unknown',
    command: serverData.command || '',
    args: serverData.args || [],
    type: serverData.type || 'stdio',
    status: serverData.status || 'unknown',
    capabilities: serverData.capabilities || [],
    description: serverData.description,
    version: serverData.version,
    lastConnected: serverData.lastConnected ? new Date(serverData.lastConnected) : undefined,
    errorMessage: serverData.errorMessage
  };
}

// GET /api/mcp/servers - List all MCP servers
router.get('/servers', async (req, res) => {
  try {
    console.log('📋 Listing MCP servers');
    const result = await executeClaudeMCPCommand(['list']);
    
    // Parse the output to extract server information
    let servers = [];
    if (result.output) {
      // Parse the text output from claude mcp list
      const lines = result.output.split('\n').filter(line => line.trim());
      
      // Check if no servers are configured
      if (lines.length === 0 || 
          lines.some(line => line.includes('No MCP servers configured')) ||
          lines.some(line => line.includes('no servers configured'))) {
        servers = [];
      } else {
        servers = lines.map(line => {
          // Parse format: "server-name: command args"
          return parseServerInfo(line, result.output);
        });
      }
    } else if (result.servers) {
      servers = result.servers.map(server => parseServerInfo(server));
    }
    
    res.json({
      servers,
      total: servers.length
    });
  } catch (error) {
    console.error('❌ Error listing MCP servers:', error.message);
    
    // If it's a "no servers" error, return empty list instead of error
    if (error.message.includes('No MCP servers configured') || 
        error.message.includes('no servers configured')) {
      res.json({
        servers: [],
        total: 0
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// GET /api/mcp/servers/:name - Get details about a specific MCP server
router.get('/servers/:name', async (req, res) => {
  try {
    const { name } = req.params;
    console.log('📄 Getting MCP server details for:', name);
    
    const result = await executeClaudeMCPCommand(['get', name]);
    const serverDetails = parseServerInfo(result);
    
    res.json(serverDetails);
  } catch (error) {
    console.error('❌ Error getting MCP server details:', error.message);
    if (error.message.includes('not found') || error.message.includes('No such server')) {
      res.status(404).json({ error: `MCP server '${req.params.name}' not found` });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// POST /api/mcp/servers - Add a new MCP server
router.post('/servers', async (req, res) => {
  try {
    const { name, command, args = [], type = 'stdio', description, env = {} } = req.body;
    
    if (!name || !command) {
      return res.status(400).json({ error: 'Name and command are required' });
    }
    
    console.log('➕ Adding MCP server:', name, 'with command:', command);
    console.log('➕ Arguments:', args);
    console.log('➕ Type:', type);
    if (Object.keys(env).length > 0) {
      console.log('➕ With environment variables:', Object.keys(env).join(', '));
    }
    
    // Build the add command arguments in correct order
    // Format: claude mcp add [options] <name> <commandOrUrl> [args...]
    const addArgs = ['add'];
    
    // Add user scope to make MCP servers available globally
    addArgs.push('--scope', 'user');
    
    // Add environment variables
    Object.entries(env).forEach(([key, value]) => {
      if (key && value) { // Only add non-empty env vars
        addArgs.push('-e', `${key}=${value}`);
      }
    });
    
    // Add transport type if not stdio
    if (type && type !== 'stdio') {
      addArgs.push('-t', type);
    }
    
    // Then add name (required)
    addArgs.push(name);
    
    // Then add command (required)
    addArgs.push(command);
    
    // Finally add arguments
    args.forEach(arg => {
      if (arg && arg.trim()) {
        addArgs.push(arg);
      }
    });
    
    console.log('🔧 Final command will be: claude mcp', addArgs.join(' '));
    console.log('🔧 Command array:', addArgs);
    
    await executeClaudeMCPCommand(addArgs);
    
    // Get the server details after adding
    try {
      const serverDetails = await executeClaudeMCPCommand(['get', name]);
      res.json({ 
        success: true, 
        server: parseServerInfo(serverDetails),
        message: `MCP server '${name}' added successfully`
      });
    } catch (getError) {
      // Server was added but we couldn't get details
      res.json({ 
        success: true,
        server: { name, command, args, type, status: 'unknown' },
        message: `MCP server '${name}' added successfully`
      });
    }
  } catch (error) {
    console.error('❌ Error adding MCP server:', error.message);
    if (error.message.includes('already exists')) {
      res.status(409).json({ error: `MCP server '${req.body.name}' already exists` });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// DELETE /api/mcp/servers/:name - Remove an MCP server
router.delete('/servers/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { force = false } = req.query;
    
    console.log('🗑️ Removing MCP server:', name);
    
    const removeArgs = ['remove', name];
    if (force) {
      removeArgs.push('--force');
    }
    
    await executeClaudeMCPCommand(removeArgs);
    
    res.json({ 
      success: true,
      message: `MCP server '${name}' removed successfully`
    });
  } catch (error) {
    console.error('❌ Error removing MCP server:', error.message);
    if (error.message.includes('not found') || error.message.includes('No such server')) {
      res.status(404).json({ error: `MCP server '${req.params.name}' not found` });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// POST /api/mcp/servers/:name/restart - Restart an MCP server
router.post('/servers/:name/restart', async (req, res) => {
  try {
    const { name } = req.params;
    console.log('🔄 Restarting MCP server:', name);
    
    // For now, restart means remove and re-add
    // This could be enhanced with actual restart functionality if Claude CLI supports it
    try {
      const serverDetails = await executeClaudeMCPCommand(['get', name]);
      await executeClaudeMCPCommand(['remove', name]);
      
      // Re-add the server with the same configuration
      const server = parseServerInfo(serverDetails);
      const addArgs = ['add', server.name, server.command, ...server.args];
      await executeClaudeMCPCommand(addArgs);
      
      res.json({ 
        success: true,
        message: `MCP server '${name}' restarted successfully`
      });
    } catch (error) {
      res.status(500).json({ error: `Failed to restart server: ${error.message}` });
    }
  } catch (error) {
    console.error('❌ Error restarting MCP server:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mcp/health - Get overall MCP health status
router.get('/health', async (req, res) => {
  try {
    console.log('🏥 Checking MCP health');
    
    const result = await executeClaudeMCPCommand(['list']);
    
    let servers = [];
    if (result.output) {
      const lines = result.output.split('\n').filter(line => line.trim());
      
      // Check if no servers are configured
      if (lines.length > 0 && 
          !lines.some(line => line.includes('No MCP servers configured') || 
                             line.includes('no servers configured'))) {
        servers = lines.map(line => parseServerInfo(line, result.output));
      }
    }
    
    const totalServers = servers.length;
    const connectedServers = servers.filter(s => s.status === 'connected').length;
    const disconnectedServers = servers.filter(s => s.status === 'disconnected').length;
    const errorServers = servers.filter(s => s.status === 'error').length;
    
    res.json({
      healthy: errorServers === 0,
      totalServers,
      connectedServers,
      disconnectedServers,
      errorServers,
      lastCheck: new Date()
    });
  } catch (error) {
    console.error('❌ Error checking MCP health:', error.message);
    
    // If it's a "no servers" error, return empty health status
    if (error.message.includes('No MCP servers configured') || 
        error.message.includes('no servers configured')) {
      res.json({
        healthy: true,
        totalServers: 0,
        connectedServers: 0,
        disconnectedServers: 0,
        errorServers: 0,
        lastCheck: new Date()
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// POST /api/mcp/import/claude-desktop - Import servers from Claude Desktop
router.post('/import/claude-desktop', async (req, res) => {
  try {
    console.log('📥 Importing MCP servers from Claude Desktop');
    
    await executeClaudeMCPCommand(['add-from-claude-desktop']);
    
    // Get updated server list
    const listResult = await executeClaudeMCPCommand(['list']);
    
    res.json({ 
      success: true,
      message: 'Successfully imported MCP servers from Claude Desktop'
    });
  } catch (error) {
    console.error('❌ Error importing from Claude Desktop:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;