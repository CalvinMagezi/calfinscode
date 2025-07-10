/*
 * ChatInterface.tsx - Chat Component with Session Protection Integration
 * 
 * SESSION PROTECTION INTEGRATION:
 * ===============================
 * 
 * This component integrates with the Session Protection System to prevent project updates
 * from interrupting active conversations:
 * 
 * Key Integration Points:
 * 1. handleSubmit() - Marks session as active when user sends message (including temp ID for new sessions)
 * 2. session-created handler - Replaces temporary session ID with real WebSocket session ID  
 * 3. claude-complete handler - Marks session as inactive when conversation finishes
 * 4. session-aborted handler - Marks session as inactive when conversation is aborted
 * 
 * This ensures uninterrupted chat experience by coordinating with App.jsx to pause sidebar updates.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback, memo, JSX } from 'react';
import ReactMarkdown from 'react-markdown';
import TodoList from './TodoList.jsx';
import CalfinsLogo from './CalfinsLogo';

import ClaudeStatus from './ClaudeStatus.jsx';
import { MicButton } from './MicButton.jsx';

import { Project, Session } from '../types/project';
import { WebSocketMessageUnion } from '../types/websocket';

// Types for component props and interfaces
interface FileItem {
  name: string;
  path: string;
  relativePath: string;
}

interface DiffLine {
  type: 'added' | 'removed';
  content: string;
  lineNum?: number;
}

interface ChatMessage {
  type: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date | string;
  isToolUse?: boolean;
  toolName?: string;
  toolInput?: string;
  toolId?: string;
  toolResult?: {
    content: string;
    isError: boolean;
    timestamp: Date;
  } | string | null;
  toolError?: boolean;
  toolResultTimestamp?: Date;
  isInteractivePrompt?: boolean;
}

interface SessionMessage {
  sessionId?: string;
  type?: string;
  timestamp?: string;
  cwd?: string;
  summary?: string;
  message?: {
    role: string;
    content: string | Array<{
      type: string;
      text?: string;
      name?: string;
      input?: any;
      id?: string;
      tool_use_id?: string;
      content?: any;
      is_error?: boolean;
    }>;
  };
}

interface ClaudeStatusInfo {
  text: string;
  tokens: number;
  can_interrupt: boolean;
}

interface MessageComponentProps {
  message: ChatMessage;
  index: number;
  prevMessage: ChatMessage | null;
  createDiff: (oldStr: string, newStr: string) => DiffLine[];
  onFileOpen?: (filePath: string, diff?: { old_string: string; new_string: string }) => void;
  onShowSettings?: () => void;
  autoExpandTools: boolean;
  showRawParameters: boolean;
}

interface ChatInterfaceProps {
  selectedProject: Project | null;
  selectedSession: Session | null;
  ws: WebSocket | null;
  sendMessage: (message: WebSocketMessageUnion) => void;
  messages: WebSocketMessageUnion[];
  onFileOpen?: (filePath: string, diff?: { old_string: string; new_string: string }) => void;
  onInputFocusChange?: (focused: boolean) => void;
  onSessionActive?: (sessionId: string) => void;
  onSessionInactive?: (sessionId: string) => void;
  onReplaceTemporarySession?: (sessionId: string) => void;
  onNavigateToSession?: (sessionId: string) => void;
  onShowSettings?: () => void;
  autoExpandTools: boolean;
  showRawParameters: boolean;
  autoScrollToBottom: boolean;
}

// Memoized message component to prevent unnecessary re-renders
const MessageComponent = memo<MessageComponentProps>(({ 
  message, 
  index, 
  prevMessage, 
  createDiff, 
  onFileOpen, 
  onShowSettings, 
  autoExpandTools, 
  showRawParameters 
}) => {
  const isGrouped = prevMessage && prevMessage.type === message.type && 
                   prevMessage.type === 'assistant' && 
                   !prevMessage.isToolUse && !message.isToolUse;
  const messageRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (!autoExpandTools || !messageRef.current || !message.isToolUse) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isExpanded) {
            setIsExpanded(true);
            // Find all details elements and open them
            const details = messageRef.current?.querySelectorAll('details');
            details?.forEach(detail => {
              detail.open = true;
            });
          }
        });
      },
      { threshold: 0.1 }
    );
    
    if (messageRef.current) {
      observer.observe(messageRef.current);
    }
    
    return () => {
      if (messageRef.current) {
        observer.unobserve(messageRef.current);
      }
    };
  }, [autoExpandTools, isExpanded, message.isToolUse]);

  return (
    <div
      ref={messageRef}
      className={`chat-message ${message.type} ${isGrouped ? 'grouped' : ''} ${message.type === 'user' ? 'flex justify-end px-3 sm:px-0' : 'px-3 sm:px-0'}`}
    >
      {message.type === 'user' ? (
        /* User message bubble on the right */
        <div className="flex items-end space-x-0 sm:space-x-3 w-full sm:w-auto sm:max-w-[85%] md:max-w-md lg:max-w-lg xl:max-w-xl">
          <div className="bg-brand-blue text-white rounded-2xl rounded-br-md px-3 sm:px-4 py-2 shadow-sm flex-1 sm:flex-initial">
            <div className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </div>
            <div className="text-xs text-brand-gray mt-1 text-right">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
          {!isGrouped && (
            <div className="hidden sm:flex w-8 h-8 bg-brand-blue rounded-full items-center justify-center text-white text-sm flex-shrink-0">
              U
            </div>
          )}
        </div>
      ) : (
        /* Claude/Error messages on the left */
        <div className="w-full">
          {!isGrouped && (
            <div className="flex items-center space-x-3 mb-2">
              {message.type === 'error' ? (
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">
                  !
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 p-1">
                  <CalfinsLogo className="w-full h-full" useIcon={true} />
                </div>
              )}
              <div className="text-sm font-medium text-brand-gray-text dark:text-white">
                {message.type === 'error' ? 'Error' : 'Claude'}
              </div>
            </div>
          )}
          
          <div className="w-full">
            
            {message.isToolUse ? (
              <div className="bg-brand-blue/10 dark:bg-brand-blue/20 border border-brand-blue/30 dark:border-brand-blue/40 rounded-lg p-2 sm:p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-brand-blue rounded flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="font-medium text-brand-blue dark:text-brand-gray">
                      Using {message.toolName}
                    </span>
                    <span className="text-xs text-brand-blue dark:text-brand-blue font-mono">
                      {message.toolId}
                    </span>
                  </div>
                  {onShowSettings && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowSettings();
                      }}
                      className="p-1 rounded hover:bg-brand-blue/20 dark:hover:bg-brand-blue/30 transition-colors"
                      title="Tool Settings"
                    >
                      <svg className="w-4 h-4 text-brand-blue dark:text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* Edit tool special handling */}
                {message.toolInput && message.toolName === 'Edit' && (() => {
                  try {
                    const input = JSON.parse(message.toolInput);
                    if (input.file_path && input.old_string && input.new_string) {
                      return (
                        <details className="mt-2" open={autoExpandTools}>
                          <summary className="text-sm text-brand-blue dark:text-brand-blue cursor-pointer hover:text-brand-blue/80 dark:hover:text-brand-blue/80 flex items-center gap-2">
                            <svg className="w-4 h-4 transition-transform details-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            📝 View edit diff for 
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onFileOpen && onFileOpen(input.file_path, {
                                  old_string: input.old_string,
                                  new_string: input.new_string
                                });
                              }}
                              className="text-brand-blue dark:text-brand-blue hover:text-brand-blue/80 dark:hover:text-brand-blue/80 underline font-mono"
                            >
                              {input.file_path.split('/').pop()}
                            </button>
                          </summary>
                          <div className="mt-3">
                            <div className="bg-brand-primary-bg dark:bg-brand-app-black border border-brand-gray/30 dark:border-brand-gray/20 rounded-lg overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 bg-brand-primary-bg dark:bg-brand-app-black border-b border-brand-gray/30 dark:border-brand-gray/20">
                                <button 
                                  onClick={() => onFileOpen && onFileOpen(input.file_path, {
                                    old_string: input.old_string,
                                    new_string: input.new_string
                                  })}
                                  className="text-xs font-mono text-brand-blue dark:text-brand-blue hover:text-brand-blue/80 dark:hover:text-brand-blue/80 truncate underline cursor-pointer"
                                >
                                  {input.file_path}
                                </button>
                                <span className="text-xs text-brand-gray-text dark:text-brand-gray-text">
                                  Diff
                                </span>
                              </div>
                              <div className="text-xs font-mono">
                                {createDiff(input.old_string, input.new_string).map((diffLine, i) => (
                                  <div key={i} className="flex">
                                    <span className={`w-8 text-center border-r ${
                                      diffLine.type === 'removed' 
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                                        : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                                    }`}>
                                      {diffLine.type === 'removed' ? '-' : '+'}
                                    </span>
                                    <span className={`px-2 py-0.5 flex-1 whitespace-pre-wrap ${
                                      diffLine.type === 'removed'
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                                        : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                                    }`}>
                                      {diffLine.content}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {showRawParameters && (
                              <details className="mt-2" open={autoExpandTools}>
                                <summary className="text-xs text-brand-blue dark:text-brand-blue cursor-pointer hover:text-brand-blue/80 dark:hover:text-brand-blue/80">
                                  View raw parameters
                                </summary>
                                <pre className="mt-2 text-xs bg-brand-blue/10 dark:bg-brand-blue/30 p-2 rounded whitespace-pre-wrap break-words overflow-hidden text-brand-blue dark:text-brand-gray">
                                  {message.toolInput}
                                </pre>
                              </details>
                            )}
                          </div>
                        </details>
                      );
                    }
                  } catch (e) {
                    // Fall back to raw display if parsing fails
                  }
                  return (
                    <details className="mt-2" open={autoExpandTools}>
                      <summary className="text-sm text-brand-blue dark:text-brand-blue cursor-pointer hover:text-brand-blue/80 dark:hover:text-brand-blue/80">
                        View input parameters
                      </summary>
                      <pre className="mt-2 text-xs bg-brand-blue/10 dark:bg-brand-blue/30 p-2 rounded whitespace-pre-wrap break-words overflow-hidden text-brand-blue dark:text-brand-gray">
                        {message.toolInput}
                      </pre>
                    </details>
                  );
                })()}

                {/* Other tools handling */}
                {message.toolInput && message.toolName !== 'Edit' && (() => {
                  // Debug log to see what we're dealing with
                  console.log('Tool display - name:', message.toolName, 'input type:', typeof message.toolInput);
                  
                  // Special handling for Write tool
                  if (message.toolName === 'Write') {
                    console.log('Write tool detected, toolInput:', message.toolInput);
                    try {
                      let input: any;
                      // Handle both JSON string and already parsed object
                      if (typeof message.toolInput === 'string') {
                        input = JSON.parse(message.toolInput);
                      } else {
                        input = message.toolInput;
                      }
                      
                      console.log('Parsed Write input:', input);
                      
                      if (input.file_path && input.content !== undefined) {
                        return (
                          <details className="mt-2" open={autoExpandTools}>
                            <summary className="text-sm text-brand-blue dark:text-brand-blue cursor-pointer hover:text-brand-blue/80 dark:hover:text-brand-blue/80 flex items-center gap-2">
                              <svg className="w-4 h-4 transition-transform details-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              📄 Creating new file: 
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onFileOpen && onFileOpen(input.file_path, {
                                    old_string: '',
                                    new_string: input.content
                                  });
                                }}
                                className="text-brand-blue dark:text-brand-blue hover:text-brand-blue/80 dark:hover:text-brand-blue/80 underline font-mono"
                              >
                                {input.file_path.split('/').pop()}
                              </button>
                            </summary>
                            <div className="mt-3">
                              <div className="bg-brand-primary-bg dark:bg-brand-app-black border border-brand-gray/30 dark:border-brand-gray/20 rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 bg-brand-primary-bg dark:bg-brand-app-black border-b border-brand-gray/30 dark:border-brand-gray/20">
                                  <button 
                                    onClick={() => onFileOpen && onFileOpen(input.file_path, {
                                      old_string: '',
                                      new_string: input.content
                                    })}
                                    className="text-xs font-mono text-brand-blue dark:text-brand-blue hover:text-brand-blue/80 dark:hover:text-brand-blue/80 truncate underline cursor-pointer"
                                  >
                                    {input.file_path}
                                  </button>
                                  <span className="text-xs text-brand-gray-text dark:text-brand-gray-text">
                                    New File
                                  </span>
                                </div>
                                <div className="text-xs font-mono">
                                  {createDiff('', input.content).map((diffLine, i) => (
                                    <div key={i} className="flex">
                                      <span className={`w-8 text-center border-r ${
                                        diffLine.type === 'removed' 
                                          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                                          : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                                      }`}>
                                        {diffLine.type === 'removed' ? '-' : '+'}
                                      </span>
                                      <span className={`px-2 py-0.5 flex-1 whitespace-pre-wrap ${
                                        diffLine.type === 'removed'
                                          ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                                          : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                                      }`}>
                                        {diffLine.content}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {showRawParameters && (
                                <details className="mt-2" open={autoExpandTools}>
                                  <summary className="text-xs text-brand-blue dark:text-brand-blue cursor-pointer hover:text-brand-blue/80 dark:hover:text-brand-blue/80">
                                    View raw parameters
                                  </summary>
                                  <pre className="mt-2 text-xs bg-brand-blue/10 dark:bg-brand-blue/30 p-2 rounded whitespace-pre-wrap break-words overflow-hidden text-brand-blue dark:text-brand-gray">
                                    {message.toolInput}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </details>
                        );
                      }
                    } catch (e) {
                      // Fall back to regular display
                    }
                  }
                  
                  // Special handling for TodoWrite tool
                  if (message.toolName === 'TodoWrite') {
                    try {
                      const input = JSON.parse(message.toolInput);
                      if (input.todos && Array.isArray(input.todos)) {
                        return (
                          <details className="mt-2" open={autoExpandTools}>
                            <summary className="text-sm text-brand-blue dark:text-brand-blue cursor-pointer hover:text-brand-blue/80 dark:hover:text-brand-blue/80 flex items-center gap-2">
                              <svg className="w-4 h-4 transition-transform details-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              Updating Todo List
                            </summary>
                            <div className="mt-3">
                              <TodoList todos={input.todos} />
                              {showRawParameters && (
                                <details className="mt-3" open={autoExpandTools}>
                                  <summary className="text-xs text-brand-blue dark:text-brand-blue cursor-pointer hover:text-brand-blue/80 dark:hover:text-brand-blue/80">
                                    View raw parameters
                                  </summary>
                                  <pre className="mt-2 text-xs bg-blue-100 dark:bg-blue-800/30 p-2 rounded overflow-x-auto text-blue-900 dark:text-blue-100">
                                    {message.toolInput}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </details>
                        );
                      }
                    } catch (e) {
                      // Fall back to regular display
                    }
                  }
                  
                  // Special handling for Bash tool
                  if (message.toolName === 'Bash') {
                    try {
                      const input = JSON.parse(message.toolInput);
                      return (
                        <details className="mt-2" open={autoExpandTools}>
                          <summary className="text-sm text-brand-blue dark:text-brand-blue cursor-pointer hover:text-brand-blue/80 dark:hover:text-brand-blue/80 flex items-center gap-2">
                            <svg className="w-4 h-4 transition-transform details-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            Running command
                          </summary>
                          <div className="mt-3 space-y-2">
                            <div className="bg-brand-app-black dark:bg-brand-primary-black text-brand-gray rounded-lg p-3 font-mono text-sm">
                              <div className="flex items-center gap-2 mb-2 text-brand-gray-text">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs">Terminal</span>
                              </div>
                              <div className="whitespace-pre-wrap break-all text-green-400">
                                $ {input.command}
                              </div>
                            </div>
                            {input.description && (
                              <div className="text-xs text-brand-gray-text dark:text-brand-gray-text italic">
                                {input.description}
                              </div>
                            )}
                            {showRawParameters && (
                              <details className="mt-2">
                                <summary className="text-xs text-brand-blue dark:text-brand-blue cursor-pointer hover:text-brand-blue/80 dark:hover:text-brand-blue/80">
                                  View raw parameters
                                </summary>
                                <pre className="mt-2 text-xs bg-brand-blue/10 dark:bg-brand-blue/30 p-2 rounded whitespace-pre-wrap break-words overflow-hidden text-brand-blue dark:text-brand-gray">
                                  {message.toolInput}
                                </pre>
                              </details>
                            )}
                          </div>
                        </details>
                      );
                    } catch (e) {
                      // Fall back to regular display
                    }
                  }
                  
                  // Special handling for Read tool
                  if (message.toolName === 'Read') {
                    try {
                      const input = JSON.parse(message.toolInput);
                      if (input.file_path) {
                        // Extract filename
                        const filename = input.file_path.split('/').pop();
                        const pathParts = input.file_path.split('/');
                        const directoryPath = pathParts.slice(0, -1).join('/');
                        
                        // Simple heuristic to show only relevant path parts
                        // Show the last 2-3 directory parts before the filename
                        const relevantParts = pathParts.slice(-4, -1); // Get up to 3 directories before filename
                        const relativePath = relevantParts.length > 0 ? relevantParts.join('/') + '/' : '';
                        
                        return (
                          <details className="mt-2" open={autoExpandTools}>
                            <summary className="text-sm text-blue-700 dark:text-blue-300 cursor-pointer hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-1">
                              <svg className="w-4 h-4 transition-transform details-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              <svg className="w-4 h-4 text-brand-blue dark:text-brand-blue ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-brand-gray-text dark:text-brand-gray-text font-mono text-xs">{relativePath}</span>
                              <span className="font-semibold text-brand-blue dark:text-brand-blue font-mono">{filename}</span>
                            </summary>
                            {showRawParameters && (
                              <div className="mt-3">
                                <details className="mt-2">
                                  <summary className="text-xs text-brand-blue dark:text-brand-blue cursor-pointer hover:text-brand-blue/80 dark:hover:text-brand-blue/80">
                                    View raw parameters
                                  </summary>
                                  <pre className="mt-2 text-xs bg-brand-blue/10 dark:bg-brand-blue/30 p-2 rounded whitespace-pre-wrap break-words overflow-hidden text-brand-blue dark:text-brand-gray">
                                    {message.toolInput}
                                  </pre>
                                </details>
                              </div>
                            )}
                          </details>
                        );
                      }
                    } catch (e) {
                      // Fall back to regular display
                    }
                  }
                  
                  // Regular tool input display for other tools
                  return (
                    <details className="mt-2" open={autoExpandTools}>
                      <summary className="text-sm text-blue-700 dark:text-blue-300 cursor-pointer hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-2">
                        <svg className="w-4 h-4 transition-transform details-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        View input parameters
                      </summary>
                      <pre className="mt-2 text-xs bg-brand-blue/10 dark:bg-brand-blue/30 p-2 rounded whitespace-pre-wrap break-words overflow-hidden text-brand-blue dark:text-brand-gray">
                        {message.toolInput}
                      </pre>
                    </details>
                  );
                })()}
                
                {/* Tool Result Section */}
                {message.toolResult && (
                  <div className="mt-3 border-t border-brand-blue/30 dark:border-brand-blue/40 pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded flex items-center justify-center ${
                        (typeof message.toolResult === 'object' && message.toolResult?.isError) 
                          ? 'bg-red-500' 
                          : 'bg-brand-green'
                      }`}>
                        <svg className={`w-3 h-3 ${(typeof message.toolResult === 'object' && message.toolResult?.isError) ? 'text-white' : 'text-brand-app-black'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {(typeof message.toolResult === 'object' && message.toolResult?.isError) ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          )}
                        </svg>
                      </div>
                      <span className={`text-sm font-medium ${
                        (typeof message.toolResult === 'object' && message.toolResult?.isError) 
                          ? 'text-red-700 dark:text-red-300' 
                          : 'text-green-700 dark:text-green-300'
                      }`}>
                        {(typeof message.toolResult === 'object' && message.toolResult?.isError) ? 'Tool Error' : 'Tool Result'}
                      </span>
                    </div>
                    
                    <div className={`text-sm ${
                      (typeof message.toolResult === 'object' && message.toolResult?.isError) 
                        ? 'text-red-800 dark:text-red-200' 
                        : 'text-green-800 dark:text-green-200'
                    }`}>
                      {(() => {
                        const content = typeof message.toolResult === 'object' && message.toolResult?.content
                          ? String(message.toolResult.content || '')
                          : String(message.toolResult || '');
                        
                        // Special handling for TodoWrite/TodoRead results
                        if ((message.toolName === 'TodoWrite' || message.toolName === 'TodoRead') &&
                            (content.includes('Todos have been modified successfully') || 
                             content.includes('Todo list') || 
                             (content.startsWith('[') && content.includes('"content"') && content.includes('"status"')))) {
                          try {
                            // Try to parse if it looks like todo JSON data
                            let todos = null;
                            if (content.startsWith('[')) {
                              todos = JSON.parse(content);
                            } else if (content.includes('Todos have been modified successfully')) {
                              // For TodoWrite success messages, we don't have the data in the result
                              return (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium">Todo list has been updated successfully</span>
                                  </div>
                                </div>
                              );
                            }
                            
                            if (todos && Array.isArray(todos)) {
                              return (
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="font-medium">Current Todo List</span>
                                  </div>
                                  <TodoList todos={todos} isResult={true} />
                                </div>
                              );
                            }
                          } catch (e) {
                            // Fall through to regular handling
                          }
                        }

                        // Regular content display
                        const fileEditMatch = content.match(/The file (.+?) has been updated\./);
                        if (fileEditMatch) {
                          return (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">File updated successfully</span>
                              </div>
                              <button 
                                onClick={() => onFileOpen && onFileOpen(fileEditMatch[1])}
                                className="text-xs font-mono bg-brand-green/10 dark:bg-brand-green/30 px-2 py-1 rounded text-brand-blue dark:text-brand-blue hover:text-brand-blue/80 dark:hover:text-brand-blue/80 underline cursor-pointer"
                              >
                                {fileEditMatch[1]}
                              </button>
                            </div>
                          );
                        }
                        
                        // Handle Write tool output for file creation
                        const fileCreateMatch = content.match(/(?:The file|File) (.+?) has been (?:created|written)(?: successfully)?\.?/);
                        if (fileCreateMatch) {
                          return (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">File created successfully</span>
                              </div>
                              <button 
                                onClick={() => onFileOpen && onFileOpen(fileCreateMatch[1])}
                                className="text-xs font-mono bg-brand-green/10 dark:bg-brand-green/30 px-2 py-1 rounded text-brand-blue dark:text-brand-blue hover:text-brand-blue/80 dark:hover:text-brand-blue/80 underline cursor-pointer"
                              >
                                {fileCreateMatch[1]}
                              </button>
                            </div>
                          );
                        }
                        
                        // Special handling for Write tool - hide content if it's just the file content
                        if (message.toolName === 'Write' && !(typeof message.toolResult === 'object' && message.toolResult?.isError)) {
                          // For Write tool, the diff is already shown in the tool input section
                          // So we just show a success message here
                          return (
                            <div className="text-green-700 dark:text-green-300">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium">File written successfully</span>
                              </div>
                              <p className="text-xs mt-1 text-green-600 dark:text-green-400">
                                The file content is displayed in the diff view above
                              </p>
                            </div>
                          );
                        }
                        
                        if (content.includes('cat -n') && content.includes('→')) {
                          return (
                            <details open={autoExpandTools}>
                              <summary className="text-sm text-green-700 dark:text-green-300 cursor-pointer hover:text-green-800 dark:hover:text-green-200 mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4 transition-transform details-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                View file content
                              </summary>
                              <div className="mt-2 bg-brand-primary-bg dark:bg-brand-app-black border border-brand-gray/30 dark:border-brand-gray/20 rounded-lg overflow-hidden">
                                <div className="text-xs font-mono p-3 whitespace-pre-wrap break-words overflow-hidden">
                                  {content}
                                </div>
                              </div>
                            </details>
                          );
                        }
                        
                        if (content.length > 300) {
                          return (
                            <details open={autoExpandTools}>
                              <summary className="text-sm text-green-700 dark:text-green-300 cursor-pointer hover:text-green-800 dark:hover:text-green-200 mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4 transition-transform details-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                View full output ({content.length} chars)
                              </summary>
                              <div className="mt-2 prose prose-sm max-w-none prose-green dark:prose-invert">
                                <ReactMarkdown>{content}</ReactMarkdown>
                              </div>
                            </details>
                          );
                        }
                        
                        return (
                          <div className="prose prose-sm max-w-none prose-green dark:prose-invert">
                            <ReactMarkdown>{content}</ReactMarkdown>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ) : message.isInteractivePrompt ? (
              // Special handling for interactive prompts
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-base mb-3">
                      Interactive Prompt
                    </h4>
                    {(() => {
                      const lines = message.content.split('\n').filter(line => line.trim());
                      const questionLine = lines.find(line => line.includes('?')) || lines[0] || '';
                      const options: Array<{ number: string; text: string; isSelected: boolean }> = [];
                      
                      // Parse the menu options
                      lines.forEach(line => {
                        // Match lines like "❯ 1. Yes" or "  2. No"
                        const optionMatch = line.match(/[❯\s]*(\d+)\.\s+(.+)/);
                        if (optionMatch) {
                          const isSelected = line.includes('❯');
                          options.push({
                            number: optionMatch[1],
                            text: optionMatch[2].trim(),
                            isSelected
                          });
                        }
                      });
                      
                      return (
                        <>
                          <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                            {questionLine}
                          </p>
                          
                          {/* Option buttons */}
                          <div className="space-y-2 mb-4">
                            {options.map((option) => (
                              <button
                                key={option.number}
                                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                                  option.isSelected
                                    ? 'bg-amber-600 dark:bg-amber-700 text-white border-amber-600 dark:border-amber-700 shadow-md'
                                    : 'bg-white dark:bg-brand-app-black text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700'
                                } cursor-not-allowed opacity-75`}
                                disabled
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    option.isSelected
                                      ? 'bg-white/20'
                                      : 'bg-amber-100 dark:bg-amber-800/50'
                                  }`}>
                                    {option.number}
                                  </span>
                                  <span className="text-sm sm:text-base font-medium flex-1">
                                    {option.text}
                                  </span>
                                  {option.isSelected && (
                                    <span className="text-lg">❯</span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                          
                          <div className="bg-amber-100 dark:bg-amber-800/30 rounded-lg p-3">
                            <p className="text-amber-900 dark:text-amber-100 text-sm font-medium mb-1">
                              ⏳ Waiting for your response in the CLI
                            </p>
                            <p className="text-amber-800 dark:text-amber-200 text-xs">
                              Please select an option in your terminal where Claude is running.
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-brand-gray-text dark:text-brand-gray">
                {message.type === 'assistant' ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-gray [&_code]:!bg-transparent [&_code]:!p-0">
                    <ReactMarkdown
                      components={{
                        code: ({node, className, children, ...props}) => {
                          const inline = !className;
                          return inline ? (
                            <strong className="text-brand-blue dark:text-brand-blue font-bold not-prose" {...props}>
                              {children}
                            </strong>
                          ) : (
                            <div className="bg-brand-primary-bg dark:bg-brand-app-black p-3 rounded-lg overflow-hidden my-2">
                              <code className="text-brand-gray-text dark:text-brand-gray text-sm font-mono block whitespace-pre-wrap break-words" {...props}>
                                {children}
                              </code>
                            </div>
                          );
                        },
                        blockquote: ({children}) => (
                          <blockquote className="border-l-4 border-brand-gray/30 dark:border-brand-gray/40 pl-4 italic text-brand-gray-text dark:text-brand-gray-text my-2">
                            {children}
                          </blockquote>
                        ),
                        a: ({href, children}) => (
                          <a href={href} className="text-brand-blue dark:text-brand-blue hover:underline" target="_blank" rel="noopener noreferrer">
                            {children}
                          </a>
                        ),
                        p: ({children}) => (
                          <div className="mb-2 last:mb-0">
                            {children}
                          </div>
                        )
                      }}
                    >
                      {String(message.content || '')}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">
                    {message.content}
                  </div>
                )}
              </div>
            )}
            
            <div className={`text-xs text-brand-gray-text dark:text-brand-gray-text mt-1 ${isGrouped ? 'opacity-0 group-hover:opacity-100' : ''}`}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// ChatInterface: Main chat component with Session Protection System integration
function ChatInterface({
  selectedProject,
  selectedSession,
  ws,
  sendMessage,
  messages,
  onFileOpen,
  onInputFocusChange,
  onSessionActive,
  onSessionInactive,
  onReplaceTemporarySession,
  onNavigateToSession,
  onShowSettings,
  autoExpandTools,
  showRawParameters,
  autoScrollToBottom
}: ChatInterfaceProps): JSX.Element {
  const [input, setInput] = useState<string>(() => {
    if (typeof window !== 'undefined' && selectedProject) {
      return localStorage.getItem(`draft_input_${selectedProject.name}`) || '';
    }
    return '';
  });
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined' && selectedProject) {
      const saved = localStorage.getItem(`chat_messages_${selectedProject.name}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(selectedSession?.id || null);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const [sessionMessages, setSessionMessages] = useState<SessionMessage[]>([]);
  const [isLoadingSessionMessages, setIsLoadingSessionMessages] = useState<boolean>(false);
  const [isSystemSessionChange, setIsSystemSessionChange] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [debouncedInput, setDebouncedInput] = useState<string>('');
  const [showFileDropdown, setShowFileDropdown] = useState<boolean>(false);
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(-1);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [atSymbolPosition, setAtSymbolPosition] = useState<number>(-1);
  const [canAbortSession, setCanAbortSession] = useState<boolean>(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState<boolean>(false);
  const scrollPositionRef = useRef<{ height: number; top: number }>({ height: 0, top: 0 });
  const [showCommandMenu, setShowCommandMenu] = useState<boolean>(false);
  const [slashCommands, setSlashCommands] = useState<any[]>([]);
  const [filteredCommands, setFilteredCommands] = useState<any[]>([]);
  const [isTextareaExpanded, setIsTextareaExpanded] = useState<boolean>(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState<number>(-1);
  const [slashPosition, setSlashPosition] = useState<number>(-1);
  const [claudeStatus, setClaudeStatus] = useState<ClaudeStatusInfo | null>(null);

  // Memoized diff calculation to prevent recalculating on every render
  const createDiff = useMemo(() => {
    const cache = new Map<string, DiffLine[]>();
    return (oldStr: string, newStr: string): DiffLine[] => {
      const key = `${oldStr.length}-${newStr.length}-${oldStr.slice(0, 50)}`;
      if (cache.has(key)) {
        return cache.get(key)!;
      }
      
      const result = calculateDiff(oldStr, newStr);
      cache.set(key, result);
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        if (firstKey) {
          cache.delete(firstKey);
        }
      }
      return result;
    };
  }, []);

  // Load session messages from API
  const loadSessionMessages = useCallback(async (projectName: string, sessionId: string): Promise<SessionMessage[]> => {
    if (!projectName || !sessionId) return [];
    
    setIsLoadingSessionMessages(true);
    try {
      const response = await fetch(`/api/projects/${projectName}/sessions/${sessionId}/messages`);
      if (!response.ok) {
        throw new Error('Failed to load session messages');
      }
      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Error loading session messages:', error);
      return [];
    } finally {
      setIsLoadingSessionMessages(false);
    }
  }, []);

  // Actual diff calculation function
  const calculateDiff = (oldStr: string, newStr: string): DiffLine[] => {
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');
    
    // Simple diff algorithm - find common lines and differences
    const diffLines: DiffLine[] = [];
    let oldIndex = 0;
    let newIndex = 0;
    
    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      const oldLine = oldLines[oldIndex];
      const newLine = newLines[newIndex];
      
      if (oldIndex >= oldLines.length) {
        // Only new lines remaining
        diffLines.push({ type: 'added', content: newLine, lineNum: newIndex + 1 });
        newIndex++;
      } else if (newIndex >= newLines.length) {
        // Only old lines remaining
        diffLines.push({ type: 'removed', content: oldLine, lineNum: oldIndex + 1 });
        oldIndex++;
      } else if (oldLine === newLine) {
        // Lines are the same - skip in diff view (or show as context)
        oldIndex++;
        newIndex++;
      } else {
        // Lines are different
        diffLines.push({ type: 'removed', content: oldLine, lineNum: oldIndex + 1 });
        diffLines.push({ type: 'added', content: newLine, lineNum: newIndex + 1 });
        oldIndex++;
        newIndex++;
      }
    }
    
    return diffLines;
  };

  const convertSessionMessages = (rawMessages: SessionMessage[]): ChatMessage[] => {
    const converted: ChatMessage[] = [];
    const toolResults = new Map<string, { content: any; isError: boolean; timestamp: Date }>(); // Map tool_use_id to tool result
    
    // First pass: collect all tool results
    for (const msg of rawMessages) {
      if (msg.message?.role === 'user' && Array.isArray(msg.message?.content)) {
        for (const part of msg.message.content) {
          if (part.type === 'tool_result') {
            toolResults.set(part.tool_use_id!, {
              content: part.content,
              isError: part.is_error || false,
              timestamp: new Date(msg.timestamp || Date.now())
            });
          }
        }
      }
    }
    
    // Second pass: process messages and attach tool results to tool uses
    for (const msg of rawMessages) {
      // Handle user messages
      if (msg.message?.role === 'user' && msg.message?.content) {
        let content = '';
        const messageType: 'user' | 'assistant' | 'error' = 'user';
        
        if (Array.isArray(msg.message.content)) {
          // Handle array content, but skip tool results (they're attached to tool uses)
          const textParts: string[] = [];
          
          for (const part of msg.message.content) {
            if (part.type === 'text') {
              textParts.push(part.text || '');
            }
            // Skip tool_result parts - they're handled in the first pass
          }
          
          content = textParts.join('\n');
        } else if (typeof msg.message.content === 'string') {
          content = msg.message.content;
        } else {
          content = String(msg.message.content);
        }
        
        // Skip command messages and empty content
        if (content && !content.startsWith('<command-name>') && !content.startsWith('[Request interrupted')) {
          converted.push({
            type: messageType,
            content: content,
            timestamp: msg.timestamp || new Date().toISOString()
          });
        }
      }
      
      // Handle assistant messages
      else if (msg.message?.role === 'assistant' && msg.message?.content) {
        if (Array.isArray(msg.message.content)) {
          for (const part of msg.message.content) {
            if (part.type === 'text') {
              converted.push({
                type: 'assistant',
                content: part.text || '',
                timestamp: msg.timestamp || new Date().toISOString()
              });
            } else if (part.type === 'tool_use') {
              // Get the corresponding tool result
              const toolResult = toolResults.get(part.id!);
              
              converted.push({
                type: 'assistant',
                content: '',
                timestamp: msg.timestamp || new Date().toISOString(),
                isToolUse: true,
                toolName: part.name,
                toolInput: JSON.stringify(part.input),
                toolResult: toolResult ? {
                  content: typeof toolResult.content === 'string' ? toolResult.content : JSON.stringify(toolResult.content),
                  isError: toolResult.isError,
                  timestamp: toolResult.timestamp
                } : null,
                toolError: toolResult?.isError || false,
                toolResultTimestamp: toolResult?.timestamp || new Date()
              });
            }
          }
        } else if (typeof msg.message.content === 'string') {
          converted.push({
            type: 'assistant',
            content: msg.message.content,
            timestamp: msg.timestamp || new Date().toISOString()
          });
        }
      }
    }
    
    return converted;
  };

  // Memoize expensive convertSessionMessages operation
  const convertedMessages = useMemo(() => {
    return convertSessionMessages(sessionMessages);
  }, [sessionMessages]);

  // Define scroll functions early to avoid hoisting issues in useEffect dependencies
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      setIsUserScrolledUp(false);
    }
  }, []);

  // Check if user is near the bottom of the scroll container
  const isNearBottom = useCallback(() => {
    if (!scrollContainerRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Consider "near bottom" if within 50px of the bottom
    return scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  // Handle scroll events to detect when user manually scrolls up
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const nearBottom = isNearBottom();
      setIsUserScrolledUp(!nearBottom);
    }
  }, [isNearBottom]);

  useEffect(() => {
    // Load session messages when session changes
    const loadMessages = async () => {
      if (selectedSession && selectedProject) {
        setCurrentSessionId(selectedSession.id);
        
        // Only load messages from API if this is a user-initiated session change
        // For system-initiated changes, preserve existing messages and rely on WebSocket
        if (!isSystemSessionChange) {
          const messages = await loadSessionMessages(selectedProject.name, selectedSession.id!);
          setSessionMessages(messages);
          // convertedMessages will be automatically updated via useMemo
          // Scroll to bottom after loading session messages if auto-scroll is enabled
          if (autoScrollToBottom) {
            setTimeout(() => scrollToBottom(), 200);
          }
        } else {
          // Reset the flag after handling system session change
          setIsSystemSessionChange(false);
        }
      } else {
        setChatMessages([]);
        setSessionMessages([]);
        setCurrentSessionId(null);
      }
    };
    
    loadMessages();
  }, [selectedSession, selectedProject, loadSessionMessages, scrollToBottom, isSystemSessionChange, autoScrollToBottom]);

  // Update chatMessages when convertedMessages changes
  useEffect(() => {
    if (sessionMessages.length > 0) {
      setChatMessages(convertedMessages);
    }
  }, [convertedMessages, sessionMessages]);

  // Notify parent when input focus changes
  useEffect(() => {
    if (onInputFocusChange) {
      onInputFocusChange(isInputFocused);
    }
  }, [isInputFocused, onInputFocusChange]);

  // Persist input draft to localStorage
  useEffect(() => {
    if (selectedProject && input !== '') {
      localStorage.setItem(`draft_input_${selectedProject.name}`, input);
    } else if (selectedProject && input === '') {
      localStorage.removeItem(`draft_input_${selectedProject.name}`);
    }
  }, [input, selectedProject]);

  // Persist chat messages to localStorage
  useEffect(() => {
    if (selectedProject && chatMessages.length > 0) {
      localStorage.setItem(`chat_messages_${selectedProject.name}`, JSON.stringify(chatMessages));
    }
  }, [chatMessages, selectedProject]);

  // Load saved state when project changes
  useEffect(() => {
    if (selectedProject) {
      const savedInput = localStorage.getItem(`draft_input_${selectedProject.name}`) || '';
      if (savedInput !== input) {
        setInput(savedInput);
      }
    }
  }, [selectedProject?.name, input]);

  // Handle WebSocket messages - CRITICAL MISSING LOGIC
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      
      switch (latestMessage.type) {
        case 'session-created':
          if ((latestMessage as any).sessionId && !currentSessionId) {
            sessionStorage.setItem('pendingSessionId', (latestMessage as any).sessionId);
            
            if (onReplaceTemporarySession) {
              onReplaceTemporarySession((latestMessage as any).sessionId);
            }
          }
          break;
          
        case 'claude-response':
          const messageData = (latestMessage as any).data?.message || (latestMessage as any).data;
          
          // Handle Claude CLI session duplication bug workaround
          if ((latestMessage as any).data?.type === 'system' && 
              (latestMessage as any).data?.subtype === 'init' && 
              (latestMessage as any).data?.session_id && 
              currentSessionId && 
              (latestMessage as any).data?.session_id !== currentSessionId) {
            
            console.log('🔄 Claude CLI session duplication detected:', {
              originalSession: currentSessionId,
              newSession: (latestMessage as any).data?.session_id
            });
            
            setIsSystemSessionChange(true);
            
            if (onNavigateToSession) {
              onNavigateToSession((latestMessage as any).data?.session_id);
            }
            return;
          }
          
          // Handle system/init for new sessions
          if ((latestMessage as any).data?.type === 'system' && 
              (latestMessage as any).data?.subtype === 'init' && 
              (latestMessage as any).data?.session_id && 
              !currentSessionId) {
            
            console.log('🔄 New session init detected:', {
              newSession: (latestMessage as any).data?.session_id
            });
            
            setIsSystemSessionChange(true);
            
            if (onNavigateToSession) {
              onNavigateToSession((latestMessage as any).data?.session_id);
            }
            return;
          }
          
          // Skip system/init messages that match current session
          if ((latestMessage as any).data?.type === 'system' && 
              (latestMessage as any).data?.subtype === 'init' && 
              (latestMessage as any).data?.session_id && 
              currentSessionId && 
              (latestMessage as any).data?.session_id === currentSessionId) {
            console.log('🔄 System init message for current session, ignoring');
            return;
          }
          
          // Handle different types of content in the response
          if (Array.isArray(messageData?.content)) {
            for (const part of messageData.content) {
              if (part.type === 'tool_use') {
                const toolInput = part.input ? JSON.stringify(part.input, null, 2) : '';
                setChatMessages(prev => [...prev, {
                  type: 'assistant',
                  content: '',
                  timestamp: new Date(),
                  isToolUse: true,
                  toolName: part.name,
                  toolInput: toolInput,
                  toolId: part.id,
                  toolResult: null
                }]);
              } else if (part.type === 'text' && part.text?.trim()) {
                setChatMessages(prev => [...prev, {
                  type: 'assistant',
                  content: part.text,
                  timestamp: new Date()
                }]);
              }
            }
          } else if (typeof messageData?.content === 'string' && messageData.content.trim()) {
            setChatMessages(prev => [...prev, {
              type: 'assistant',
              content: messageData.content,
              timestamp: new Date()
            }]);
          }
          
          // Handle tool results from user messages
          if (messageData?.role === 'user' && Array.isArray(messageData.content)) {
            for (const part of messageData.content) {
              if (part.type === 'tool_result') {
                setChatMessages(prev => prev.map(msg => {
                  if (msg.isToolUse && msg.toolId === part.tool_use_id) {
                    return {
                      ...msg,
                      toolResult: {
                        content: part.content,
                        isError: part.is_error,
                        timestamp: new Date()
                      }
                    };
                  }
                  return msg;
                }));
              }
            }
          }
          break;
          
        case 'claude-complete':
          setIsLoading(false);
          setCanAbortSession(false);
          setClaudeStatus(null);
          
          const activeSessionId = currentSessionId || sessionStorage.getItem('pendingSessionId');
          if (activeSessionId && onSessionInactive) {
            onSessionInactive(activeSessionId);
          }
          
          const pendingSessionId = sessionStorage.getItem('pendingSessionId');
          if (pendingSessionId && !currentSessionId && (latestMessage as any).exitCode === 0) {
            setCurrentSessionId(pendingSessionId);
            sessionStorage.removeItem('pendingSessionId');
          }
          break;
          
        case 'session-aborted':
          setIsLoading(false);
          setCanAbortSession(false);
          setClaudeStatus(null);
          
          if (currentSessionId && onSessionInactive) {
            onSessionInactive(currentSessionId);
          }
          
          setChatMessages(prev => [...prev, {
            type: 'assistant',
            content: 'Session interrupted by user.',
            timestamp: new Date()
          }]);
          break;

        case 'claude-status':
          console.log('🔔 Received claude-status message:', latestMessage);
          const statusData = (latestMessage as any).data;
          if (statusData) {
            let statusInfo = {
              text: 'Working...',
              tokens: 0,
              can_interrupt: true
            };
            
            if (statusData.message) {
              statusInfo.text = statusData.message;
            } else if (statusData.status) {
              statusInfo.text = statusData.status;
            } else if (typeof statusData === 'string') {
              statusInfo.text = statusData;
            }
            
            if (statusData.tokens) {
              statusInfo.tokens = statusData.tokens;
            } else if (statusData.token_count) {
              statusInfo.tokens = statusData.token_count;
            }
            
            if (statusData.can_interrupt !== undefined) {
              statusInfo.can_interrupt = statusData.can_interrupt;
            }
            
            console.log('📊 Setting claude status:', statusInfo);
            setClaudeStatus(statusInfo);
            setIsLoading(true);
            setCanAbortSession(statusInfo.can_interrupt);
          }
          break;
      }
    }
  }, [messages, selectedProject, selectedSession, currentSessionId, onSessionInactive, onReplaceTemporarySession, onNavigateToSession]);

  // Auto-scroll logic
  useEffect(() => {
    if (scrollContainerRef.current && chatMessages.length > 0) {
      if (autoScrollToBottom) {
        if (!isUserScrolledUp) {
          setTimeout(() => scrollToBottom(), 50);
        }
      }
    }
  }, [chatMessages.length, isUserScrolledUp, scrollToBottom, autoScrollToBottom]);

  // Scroll to bottom when messages first load
  useEffect(() => {
    if (scrollContainerRef.current && chatMessages.length > 0) {
      setIsUserScrolledUp(false);
      setTimeout(() => scrollToBottom(), 200);
    }
  }, [chatMessages.length > 0, scrollToBottom]);

  // Add scroll event listener
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Don't render if no project is selected
  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-brand-gray-text dark:text-brand-gray-text">
          <p>Select a project to start chatting with Claude</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          details[open] .details-chevron {
            transform: rotate(180deg);
          }
        `}
      </style>
      <div className="h-full flex flex-col">
        {/* Messages Area - Scrollable Middle Section */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-0 py-3 sm:p-4 space-y-3 sm:space-y-4 relative"
        >
          {isLoadingSessionMessages && chatMessages.length === 0 ? (
            <div className="text-center text-brand-gray-text dark:text-brand-gray-text mt-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-gray"></div>
                <p>Loading session messages...</p>
              </div>
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-brand-gray-text dark:text-brand-gray-text px-6 sm:px-4">
                <p className="font-bold text-lg sm:text-xl mb-3">Start a conversation with Claude</p>
                <p className="text-sm sm:text-base leading-relaxed">
                  Ask questions about your code, request changes, or get help with development tasks
                </p>
              </div>
            </div>
          ) : (
            <>
              {chatMessages.length > 100 && (
                <div className="text-center text-brand-gray-text dark:text-brand-gray-text text-sm py-2 border-b border-brand-gray/30 dark:border-brand-gray/20">
                  Showing last 100 messages ({chatMessages.length} total) • 
                  <button className="ml-1 text-brand-blue hover:text-brand-blue/80 underline">
                    Load earlier messages
                  </button>
                </div>
              )}
              
              {chatMessages.slice(-100).map((message, index) => {
                const prevMessage = index > 0 ? chatMessages.slice(-100)[index - 1] : null;
                
                return (
                  <MessageComponent
                    key={index}
                    message={message}
                    index={index}
                    prevMessage={prevMessage}
                    createDiff={createDiff}
                    onFileOpen={onFileOpen}
                    onShowSettings={onShowSettings}
                    autoExpandTools={autoExpandTools}
                    showRawParameters={showRawParameters}
                  />
                );
              })}
            </>
          )}
          
          {isLoading && (
            <div className="chat-message assistant">
              <div className="w-full">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 bg-brand-gray-text rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">
                    C
                  </div>
                  <div className="text-sm font-medium text-brand-gray-text dark:text-white">Claude</div>
                </div>
                <div className="w-full text-sm text-brand-gray-text dark:text-brand-gray-text pl-3 sm:pl-0">
                  <div className="flex items-center space-x-1">
                    <div className="animate-pulse">●</div>
                    <div className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</div>
                    <div className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</div>
                    <span className="ml-2">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {isUserScrolledUp && chatMessages.length > 0 && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 w-12 h-12 bg-brand-blue hover:bg-brand-blue/80 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 dark:ring-offset-brand-app-black z-50"
            title="Scroll to bottom"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}

        {/* Input Area */}
        <div className={`p-2 sm:p-4 md:p-6 flex-shrink-0 ${
          isInputFocused ? 'pb-2 sm:pb-4 md:pb-6' : 'pb-16 sm:pb-4 md:pb-6'
        }`}>
          <ClaudeStatus 
            status={claudeStatus}
            isLoading={isLoading}
            onAbort={() => {
              if (currentSessionId && canAbortSession) {
                sendMessage({
                  type: 'abort-session',
                  sessionId: currentSessionId!
                });
              }
            }}
          />
          
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim() || isLoading || !selectedProject) return;

            const userMessage: ChatMessage = {
              type: 'user',
              content: input,
              timestamp: new Date()
            };

            setChatMessages(prev => [...prev, userMessage]);
            setIsLoading(true);
            setCanAbortSession(true);
            setClaudeStatus({
              text: 'Processing',
              tokens: 0,
              can_interrupt: true
            });
            
            setIsUserScrolledUp(false);
            setTimeout(() => scrollToBottom(), 100);

            const sessionToActivate = currentSessionId || `new-session-${Date.now()}`;
            if (onSessionActive) {
              onSessionActive(sessionToActivate);
            }

            const getToolsSettings = () => {
              try {
                const savedSettings = localStorage.getItem('claude-tools-settings');
                if (savedSettings) {
                  return JSON.parse(savedSettings);
                }
              } catch (error) {
                console.error('Error loading tools settings:', error);
              }
              return {
                allowedTools: [],
                disallowedTools: [],
                skipPermissions: false
              };
            };

            const toolsSettings = getToolsSettings();

            sendMessage({
              type: 'claude-command',
              command: input,
              options: {
                projectPath: selectedProject.path || selectedProject.fullPath,
                cwd: selectedProject.fullPath,
                sessionId: currentSessionId || undefined,
                resume: !!currentSessionId,
                toolsSettings: toolsSettings
              }
            });

            setInput('');
            setIsTextareaExpanded(false);
            if (selectedProject) {
              localStorage.removeItem(`draft_input_${selectedProject.name}`);
            }
          }} className="relative max-w-4xl mx-auto">
            <div className={`relative bg-white dark:bg-brand-app-black rounded-2xl shadow-lg border border-brand-gray/30 dark:border-brand-gray/40 focus-within:ring-2 focus-within:ring-brand-blue dark:focus-within:ring-brand-blue focus-within:border-brand-blue transition-all duration-200 ${isTextareaExpanded ? 'chat-input-expanded' : ''}`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setCursorPosition(e.target.selectionStart || 0);
                }}
                onClick={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
                      e.preventDefault();
                      // Submit form
                    } else if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                      // Submit form
                    }
                  }
                }}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                  setCursorPosition(target.selectionStart || 0);
                  
                  const lineHeight = parseInt(window.getComputedStyle(target).lineHeight);
                  const isExpanded = target.scrollHeight > lineHeight * 2;
                  setIsTextareaExpanded(isExpanded);
                }}
                placeholder="Ask Claude to help with your code... (@ to reference files)"
                disabled={isLoading}
                rows={1}
                className="chat-input-placeholder w-full px-4 sm:px-6 py-3 sm:py-4 pr-28 sm:pr-40 bg-transparent rounded-2xl focus:outline-none text-brand-gray-text dark:text-brand-gray placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 resize-none min-h-[40px] sm:min-h-[56px] max-h-[40vh] sm:max-h-[300px] overflow-y-auto text-sm sm:text-base transition-all duration-200"
                style={{ height: 'auto' }}
              />
              
              {/* Clear button */}
              {input.trim() && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setInput('');
                    if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto';
                      textareaRef.current.focus();
                    }
                    setIsTextareaExpanded(false);
                  }}
                  className="absolute -left-0.5 -top-3 sm:right-28 sm:left-auto sm:top-1/2 sm:-translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 bg-brand-primary-bg hover:bg-brand-gray/20 dark:bg-brand-app-black dark:hover:bg-brand-gray/20 border border-brand-gray/30 dark:border-brand-gray/40 rounded-full flex items-center justify-center transition-all duration-200 group z-10 shadow-sm"
                  title="Clear input"
                >
                  <svg 
                    className="w-3 h-3 sm:w-4 sm:h-4 text-brand-gray-text dark:text-brand-gray group-hover:text-brand-gray-text dark:group-hover:text-brand-gray transition-colors" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M6 18L18 6M6 6l12 12" 
                    />
                  </svg>
                </button>
              )}
              
              {/* Send button */}
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-12 h-12 sm:w-12 sm:h-12 bg-brand-blue hover:bg-brand-blue/80 disabled:bg-brand-gray-text disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 dark:ring-offset-brand-app-black"
              >
                <svg 
                  className="w-4 h-4 sm:w-5 sm:h-5 text-white transform rotate-90" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
                  />
                </svg>
              </button>
            </div>
            
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2 hidden sm:block">
              Press Enter to send • Shift+Enter for new line • @ to reference files
            </div>
            <div className={`text-xs text-gray-500 dark:text-gray-400 text-center mt-2 sm:hidden transition-opacity duration-200 ${
              isInputFocused ? 'opacity-100' : 'opacity-0'
            }`}>
              Enter to send • @ for files
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default React.memo(ChatInterface);