export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  workingDirectory?: string;
  roleId?: string;
  modelId?: string;
  runDir?: string;
  exitCode?: number | null;
}

interface TaskCardProps {
  task: Task;
  onRun: (task: Task) => void;
  onStop: (taskId: string) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}

export function TaskCard({ task, onRun, onStop, onDelete, onClick }: TaskCardProps) {
  const statusConfig = {
    todo: {
      border: 'border-l-[#6c9eff]',
      bg: 'bg-[#6c9eff]/10',
      icon: '○',
      label: 'Todo'
    },
    in_progress: {
      border: 'border-l-[#ffd93d]',
      bg: 'bg-[#ffd93d]/10',
      icon: '◐',
      label: 'Running'
    },
    done: {
      border: 'border-l-[#00d4aa]',
      bg: 'bg-[#00d4aa]/10',
      icon: '●',
      label: 'Done'
    },
  };

  const config = statusConfig[task.status];
  const isRunning = task.status === 'in_progress';

  return (
    <div
      onClick={onClick}
      className={`task-card bg-[var(--bg-secondary)] rounded-xl p-4 border-l-4 ${config.border} cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors group`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-[var(--text-primary)] flex-1 line-clamp-1">
          {task.title}
        </h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="text-[var(--text-secondary)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${config.bg}`}>
          <span>{config.icon}</span>
          <span>
            {config.label}
            {task.status === 'done' && task.exitCode !== undefined && task.exitCode !== null && (
              <span className={task.exitCode === 0 ? 'text-green-400' : 'text-red-400'}>
                {' '}(exit: {task.exitCode})
              </span>
            )}
          </span>
          {isRunning && <span className="animate-pulse">...</span>}
        </div>

        {/* Run Button - only for todo tasks */}
        {task.status === 'todo' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRun(task);
            }}
            className="text-xs bg-[var(--accent)] text-[var(--bg-primary)] px-3 py-1.5 rounded-lg hover:bg-[var(--accent-dim)] transition-colors font-medium"
          >
            ▶ Run
          </button>
        )}

        {/* Stop Button - only for running tasks */}
        {isRunning && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStop(task.id);
            }}
            className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors font-medium"
          >
            ■ Stop
          </button>
        )}
      </div>

      {/* Working Directory - shown if set */}
      {task.workingDirectory && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-secondary)] font-mono truncate" title={task.workingDirectory}>
            📂 {task.workingDirectory}
          </p>
        </div>
      )}

      {/* Run Directory - shown if exists and different from workingDirectory */}
      {task.runDir && !task.workingDirectory && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--accent-dim)] font-mono truncate" title={task.runDir}>
            📁 {task.runDir.split('/').slice(-1)[0]}
          </p>
        </div>
      )}
    </div>
  );
}
