import { useRef, useState, useCallback, useEffect } from 'react';
import { Terminal } from './components/Terminal';
import { TaskBoard } from './components/TaskBoard';
import type { Task } from './components/TaskCard';

function App() {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [pendingTaskStart, setPendingTaskStart] = useState<{ taskId: string, prompt: string } | null>(null);

  // When connected and there's a pending task, start it
  useEffect(() => {
    if (isConnected && pendingTaskStart && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'start_task',
        taskId: pendingTaskStart.taskId,
        prompt: pendingTaskStart.prompt
      }));
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => setPendingTaskStart(null), 0);
    }
  }, [isConnected, pendingTaskStart]);

  // Listen for task updates to refresh selectedTask
  useEffect(() => {
    if (!selectedTask || !wsRef.current) return;
    const currentWs = wsRef.current;

    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'task:updated' && msg.task.id === selectedTask.id) {
          setSelectedTask(msg.task);
        }
      } catch {
        // Ignore parse errors
      }
    };

    currentWs.addEventListener('message', handleMessage);
    return () => {
      currentWs.removeEventListener('message', handleMessage);
    };
  }, [selectedTask]);

  const handleStartTask = useCallback((taskId: string, prompt: string, task: Task) => {
    // Set task as selected and mark as pending start
    // Also reset connection status to ensure we wait for the new terminal's connection
    setIsConnected(false);
    setSelectedTask(task);
    setPendingTaskStart({ taskId, prompt });
  }, []);

  const handleBack = () => {
    setSelectedTask(null);
  };

  const handleConnected = useCallback(() => setIsConnected(true), []);
  const handleDisconnected = useCallback(() => setIsConnected(false), []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-secondary)] gap-4">
        <div className="flex items-center gap-3">
          {selectedTask && (
            <button
              onClick={handleBack}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] mr-2 transition-colors"
            >
              ← Back
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#6c9eff] flex items-center justify-center">
            <span className="text-[var(--bg-primary)] font-bold text-sm">G</span>
          </div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            Gemini Kanban Board
          </h1>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00d4aa]' : 'bg-[#ff6b6b]'}`} />
          <span className="text-sm text-[var(--text-secondary)]">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedTask ? (
          <div className="flex-1 flex flex-col">
            {/* Task Header */}
            <div className="px-4 md:px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] break-words">
                    {selectedTask.title}
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 break-words">
                    {selectedTask.description}
                  </p>
                  {/* Working Directory - prominent display */}
                  {selectedTask.workingDirectory && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg w-fit max-w-full">
                      <span className="text-sm shrink-0">📂</span>
                      <span className="text-sm font-mono text-[var(--accent)] truncate">
                        {selectedTask.workingDirectory}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                  {selectedTask.runDir && !selectedTask.workingDirectory && (
                    <span className="text-xs text-[var(--accent-dim)] font-mono truncate max-w-[200px]">
                      📁 {selectedTask.runDir.split('/').slice(-1)[0]}
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${selectedTask.status === 'done'
                    ? 'bg-[#00d4aa]/20 text-[#00d4aa]'
                    : selectedTask.status === 'in_progress'
                      ? 'bg-[#ffd93d]/20 text-[#ffd93d]'
                      : 'bg-[#6c9eff]/20 text-[#6c9eff]'
                    }`}>
                    {selectedTask.status === 'todo' ? 'Starting...' :
                      selectedTask.status === 'in_progress' ? 'Running...' :
                        `Done (Exit: ${selectedTask.exitCode ?? '?'})`}
                  </span>
                </div>
              </div>
            </div>

            {/* Terminal */}
            <div className="flex-1">
              <Terminal
                wsRef={wsRef}
                task={selectedTask}
                onConnected={handleConnected}
                onDisconnected={handleDisconnected}
              />
            </div>
          </div>
        ) : (
          <TaskBoard
            onStartTask={handleStartTask}
            wsRef={wsRef}
            onSelectTask={setSelectedTask}
            onConnectedChange={setIsConnected}
          />
        )}
      </main>
    </div>
  );
}

export default App;
