import { useState, useEffect, useCallback, useRef } from 'react';
import { TaskCard, type Task } from './TaskCard';
import { Terminal } from './Terminal';
import { RolesManager, type Role } from './RolesManager';

interface TaskBoardProps {
  onStartTask: (taskId: string, prompt: string, task: Task) => void;
  wsRef: React.MutableRefObject<WebSocket | null>;
  onSelectTask: (task: Task) => void;
  onConnectedChange: (connected: boolean) => void;
}

const API_BASE = '';

export function TaskBoard({ onStartTask, wsRef, onSelectTask, onConnectedChange }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newWorkingDir, setNewWorkingDir] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Roles state
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [isRolesManagerOpen, setIsRolesManagerOpen] = useState(false);

  const columns = [
    { id: 'todo' as const, label: 'Todo', color: '#6c9eff', icon: '○' },
    { id: 'in_progress' as const, label: 'Running', color: '#ffd93d', icon: '◐' },
    { id: 'done' as const, label: 'Done', color: '#00d4aa', icon: '●' },
  ];

  // Load tasks from API
  const loadTasks = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load roles
  const loadRoles = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/roles`);
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  }, []);

  // Listen for WebSocket updates
  useEffect(() => {
    loadTasks();
    loadRoles();

    const handleWsMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'task:created':
            setTasks(prev => {
              if (prev.some(t => t.id === msg.task.id)) return prev;
              return [...prev, msg.task];
            });
            break;
          case 'task:updated':
            setTasks(prev => prev.map(t => t.id === msg.task.id ? msg.task : t));
            break;
          case 'task:deleted':
            setTasks(prev => prev.filter(t => t.id !== msg.taskId));
            break;
        }
      } catch {
        // Ignore non-JSON messages (terminal output)
      }
    };

    const ws = wsRef.current;
    if (ws) {
      ws.addEventListener('message', handleWsMessage);
    }

    const pollInterval = setInterval(loadTasks, 5000);

    return () => {
      if (ws) {
        ws.removeEventListener('message', handleWsMessage);
      }
      clearInterval(pollInterval);
    };
  }, [loadTasks, loadRoles, wsRef]);

  const handleCreateTask = async () => {
    if (!newTitle.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          workingDirectory: newWorkingDir.trim() || undefined,
          roleId: selectedRoleId || undefined,
        }),
      });

      if (response.ok) {
        const task = await response.json();
        setTasks(prev => {
          if (prev.some(t => t.id === task.id)) return prev;
          return [...prev, task];
        });
        setNewTitle('');
        setNewDescription('');
        setNewWorkingDir('');
        setSelectedRoleId('');
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTasks(prev => prev.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  // Use refs for stable callbacks to avoid Terminal re-renders
  const onConnectedChangeRef = useRef(onConnectedChange);
  useEffect(() => {
    onConnectedChangeRef.current = onConnectedChange;
  }, [onConnectedChange]);

  const handleTerminalConnected = useCallback(() => {
    onConnectedChangeRef.current(true);
  }, []);

  const handleTerminalDisconnected = useCallback(() => {
    onConnectedChangeRef.current(false);
  }, []);

  const handleRunTask = (task: Task) => {
    onStartTask(task.id, task.description, task);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-[var(--text-secondary)]">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Task Board Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 py-4 border-b border-[var(--border)] gap-4">
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          {columns.map((column) => {
            const count = tasks.filter(t => t.status === column.id).length;
            return (
              <div key={column.id} className="flex items-center gap-2">
                <span style={{ color: column.color }}>{column.icon}</span>
                <span className="text-sm text-[var(--text-secondary)]">{column.label}</span>
                <span className="text-xs bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-[var(--text-secondary)]">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsRolesManagerOpen(true)}
            className="text-sm border border-[var(--border)] text-[var(--text-secondary)] px-4 py-2 rounded-lg hover:border-[var(--accent)] hover:text-[var(--text-primary)] transition-colors w-full md:w-auto"
          >
            Manage Roles
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="text-sm bg-[var(--accent)] text-[var(--bg-primary)] px-4 py-2 rounded-lg hover:bg-[var(--accent-dim)] transition-colors font-medium w-full md:w-auto"
          >
            + New Task
          </button>
        </div>
      </div>

      <RolesManager
        isOpen={isRolesManagerOpen}
        onClose={() => setIsRolesManagerOpen(false)}
        onRolesChanged={loadRoles}
      />

      {/* Create Task Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 w-full max-w-lg border border-[var(--border)] shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">New Task</h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task title..."
              className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg px-4 py-3 mb-3 outline-none focus:border-[var(--accent)] text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCreateTask();
                }
                if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewTitle('');
                  setNewDescription('');
                  setNewWorkingDir('');
                  setSelectedRoleId('');
                }
              }}
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Describe what Gemini should do..."
              className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg px-4 py-3 mb-3 outline-none focus:border-[var(--accent)] text-sm resize-none"
              rows={4}
            />

            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Working Directory */}
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Working Directory (Optional)</label>
                <input
                  type="text"
                  value={newWorkingDir}
                  onChange={(e) => setNewWorkingDir(e.target.value)}
                  placeholder="/path/to/project"
                  className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)] text-sm font-mono"
                />
              </div>

              {/* Roles Dropdown */}
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Role / Persona</label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)] text-sm appearance-none"
                >
                  <option value="">Default (General Helper)</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewTitle('');
                  setNewDescription('');
                  setNewWorkingDir('');
                  setSelectedRoleId('');
                }}
                className="text-sm text-[var(--text-secondary)] px-4 py-2 rounded-lg hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTitle.trim()}
                className="text-sm bg-[var(--accent)] text-[var(--bg-primary)] px-4 py-2 rounded-lg hover:bg-[var(--accent-dim)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board - Responsive Columns */}
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto md:overflow-hidden">
          {columns.map((column) => {
            const columnTasks = tasks.filter(t => t.status === column.id);
            return (
              <div key={column.id} className="flex flex-col min-h-0 h-full">
                {/* Column Header */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-primary)] z-10 md:static md:bg-transparent">
                  <span className="text-lg" style={{ color: column.color }}>{column.icon}</span>
                  <h3 className="font-semibold text-[var(--text-primary)]">{column.label}</h3>
                  <span className="text-xs bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full text-[var(--text-secondary)]">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Content */}
                <div className="flex-1 md:overflow-y-auto space-y-3 pr-1">
                  {columnTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center opacity-50">
                      <span className="text-2xl mb-2">{column.icon}</span>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {column.id === 'todo' ? 'No tasks to do' :
                          column.id === 'in_progress' ? 'No running tasks' :
                            'No completed tasks'}
                      </p>
                    </div>
                  ) : (
                    columnTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onRun={handleRunTask}
                        onDelete={handleDelete}
                        onClick={() => onSelectTask(task)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hidden Terminal for WebSocket connection */}
      <div className="hidden">
        <Terminal
          wsRef={wsRef}
          onConnected={handleTerminalConnected}
          onDisconnected={handleTerminalDisconnected}
        />
      </div>
    </div>
  );
}
