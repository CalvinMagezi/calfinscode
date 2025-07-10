# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev          # Run both server (port 3002) and client (port 3001) concurrently
npm run server       # Run backend server only
npm run client       # Run frontend dev server only
```

### Production Build
```bash
npm run build        # Build frontend for production
npm start            # Build and run production server
```

## Architecture Overview

This is Calfins Code - a web UI for Claude Code CLI that provides desktop and mobile interfaces for managing Claude sessions and projects.

### Tech Stack
- **Frontend**: React 18 + Vite, Tailwind CSS, CodeMirror, React Router
- **Backend**: Node.js + Express with WebSocket support, node-pty for terminal integration
- **Communication**: WebSocket for real-time updates between frontend and backend

### Key Components

**Backend Architecture** (`server/`):
- `index.js`: Main Express server with WebSocket handling for real-time communication
- `claude-cli.js`: Claude CLI process management and integration
- `projects.js`: Project discovery and management from `~/.claude/projects/`
- `routes/git.js`: Git operations API endpoints

**Frontend Architecture** (`src/`):
- `App.jsx`: Main app with routing and session protection system
- `components/ChatInterface.jsx`: Real-time chat with Claude including message streaming
- `components/Shell.jsx`: Terminal integration using xterm.js
- `components/FileTree.jsx` & `components/CodeEditor.jsx`: File browsing and editing
- `components/GitPanel.jsx`: Git integration UI

### Critical Patterns

1. **Session Protection**: The app implements a complex session protection system to prevent UI disruption during active conversations. This involves:
   - Blocking project updates during active sessions
   - WebSocket event coordination between frontend and backend
   - State management for conversation lifecycle

2. **WebSocket Communication**: Real-time bidirectional communication for:
   - Chat message streaming
   - Project refresh events
   - Session state updates
   - File system changes

3. **File System Access**: Backend provides controlled access to project files through API endpoints, with security boundaries enforced server-side.

4. **Process Management**: Claude CLI processes are spawned and managed by the backend, with stdout/stderr streamed via WebSocket.

### Environment Configuration

Create `.env` file with:
```
PORT=3008          # Backend server port
VITE_PORT=3009     # Frontend dev server port
```

### Important Notes

- Tools are disabled by default for security - users must manually enable them
- All Claude CLI operations go through the backend process management layer
- The UI requires Claude Code CLI to be installed and configured
- Project discovery relies on `~/.claude/projects/` directory structure