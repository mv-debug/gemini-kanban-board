import 'dotenv/config';
import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { spawn, exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, readdirSync, statSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

// Data directory for persistent storage
const DATA_DIR = join(__dirname, '.data');
const TASKS_FILE = join(DATA_DIR, 'tasks.json');
const ROLES_FILE = join(DATA_DIR, 'roles.json');
const RUNS_DIR = join(__dirname, '.runs');

// Ensure directories exist
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}
if (!existsSync(RUNS_DIR)) {
  mkdirSync(RUNS_DIR, { recursive: true });
}

// Load tasks from file
function loadTasks() {
  try {
    if (existsSync(TASKS_FILE)) {
      const data = readFileSync(TASKS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading tasks:', e);
  }
  return [];
}

// Save tasks to file
function saveTasks(tasks) {
  try {
    writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
  } catch (e) {
    console.error('Error saving tasks:', e);
  }
}

// Load roles from file
function loadRoles() {
  try {
    if (existsSync(ROLES_FILE)) {
      const data = readFileSync(ROLES_FILE, 'utf-8');
      return JSON.parse(data);
    }
    // Default roles if file doesn't exist
    const defaultRoles = [
      { id: 'dev', name: 'Software Developer', systemPrompt: 'You are an expert software developer. Focus on writing clean, maintainable, and efficient code. Always explain your implementation decisions.' },
      { id: 'test', name: 'QA Tester', systemPrompt: 'You are a QA automation expert. Focus on finding edge cases, security vulnerabilities, and ensuring code testability. Prefer writing Playwright or Vitest tests.' },
      { id: 'arch', name: 'System Architect', systemPrompt: 'You are a System Architect. Focus on scalability, maintainability, and architectural patterns. Review the code for structural improvements.' }
    ];
    saveRoles(defaultRoles);
    return defaultRoles;
  } catch (e) {
    console.error('Error loading roles:', e);
    return [];
  }
}

// Save roles to file
function saveRoles(roles) {
  try {
    writeFileSync(ROLES_FILE, JSON.stringify(roles, null, 2));
  } catch (e) {
    console.error('Error saving roles:', e);
  }
}

// Broadcast to all connected WebSocket clients
function broadcast(message) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(data);
    }
  });
}

// Update task status and broadcast
function updateTaskStatus(taskId, status, exitCode = null) {
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return;

  tasks[taskIndex].status = status;
  tasks[taskIndex].updatedAt = new Date().toISOString();
  if (exitCode !== null) {
    tasks[taskIndex].exitCode = exitCode;
  }

  saveTasks(tasks);
  broadcast({ type: 'task:updated', task: tasks[taskIndex] });
  console.log(`Task ${taskId} status → ${status}${exitCode !== null ? ` (exit: ${exitCode})` : ''}`);
}

// In-memory state (synced with file)
let tasks = loadTasks();
let roles = loadRoles();

// ============================================
// REST API
// ============================================

// --- Tasks ---

// Get all tasks
app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

// Create a new task
app.post('/api/tasks', (req, res) => {
  const { title, description, workingDirectory, roleId } = req.body;

  if (!title) {
    return res.status(422).json({ error: 'Title is required' });
  }

  const task = {
    id: Date.now().toString(),
    title,
    description: description || '',
    workingDirectory: workingDirectory || null,
    roleId: roleId || null,
    status: 'todo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runDir: null,
    exitCode: null,
  };

  tasks.push(task);
  saveTasks(tasks);

  broadcast({ type: 'task:created', task });
  console.log(`Task created: ${task.title} (Role: ${task.roleId || 'default'})`);
  res.status(201).json(task);
});

// Update a task
app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks[taskIndex] = {
    ...tasks[taskIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveTasks(tasks);
  broadcast({ type: 'task:updated', task: tasks[taskIndex] });

  console.log(`Task updated: ${tasks[taskIndex].title} → ${updates.status || 'no status change'}`);
  res.json(tasks[taskIndex]);
});

// Delete a task
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;

  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const deleted = tasks.splice(taskIndex, 1)[0];
  saveTasks(tasks);

  broadcast({ type: 'task:deleted', taskId: id });
  console.log(`Task deleted: ${deleted.title}`);
  res.status(204).send();
});

// --- Roles ---

// Get all roles
app.get('/api/roles', (req, res) => {
  res.json(roles);
});

// Create a new role
app.post('/api/roles', (req, res) => {
  const { name, systemPrompt } = req.body;

  if (!name || !systemPrompt) {
    return res.status(422).json({ error: 'Name and system prompt are required' });
  }

  const role = {
    id: Date.now().toString(),
    name,
    systemPrompt
  };

  roles.push(role);
  saveRoles(roles);

  console.log(`Role created: ${role.name}`);
  res.status(201).json(role);
});

// Delete a role
app.delete('/api/roles/:id', (req, res) => {
  const { id } = req.params;

  const roleIndex = roles.findIndex(r => r.id === id);
  if (roleIndex === -1) {
    return res.status(404).json({ error: 'Role not found' });
  }

  const deleted = roles.splice(roleIndex, 1)[0];
  saveRoles(roles);

  console.log(`Role deleted: ${deleted.name}`);
  res.status(204).send();
});


// --- Directories (for path autocomplete) ---

// Get directory suggestions for path autocomplete
app.get('/api/directories', (req, res) => {
  const { path: inputPath } = req.query;

  if (!inputPath || typeof inputPath !== 'string') {
    return res.status(400).json({ error: 'Path query parameter is required' });
  }

  try {
    // Resolve the path to handle ~ and relative paths
    let resolvedInput = inputPath;
    if (inputPath.startsWith('~')) {
      resolvedInput = inputPath.replace('~', process.env.HOME || '/');
    }

    // Determine parent directory and prefix
    let parentDir;
    let prefix;

    try {
      const stat = statSync(resolvedInput);
      if (stat.isDirectory()) {
        // Input is a complete directory, list its contents
        parentDir = resolvedInput;
        prefix = '';
      } else {
        parentDir = dirname(resolvedInput);
        prefix = basename(resolvedInput);
      }
    } catch {
      // Path doesn't exist yet, use parent directory
      parentDir = dirname(resolvedInput);
      prefix = basename(resolvedInput);
    }

    // Check if parent directory exists
    let parentExists = false;
    try {
      const parentStat = statSync(parentDir);
      parentExists = parentStat.isDirectory();
    } catch {
      parentExists = false;
    }

    if (!parentExists) {
      return res.json({
        suggestions: [],
        isValid: false,
        parentExists: false
      });
    }

    // Read directory entries
    const entries = readdirSync(parentDir, { withFileTypes: true });

    // Filter to directories only, matching prefix, and limit results
    const suggestions = entries
      .filter(entry => entry.isDirectory())
      .filter(entry => !entry.name.startsWith('.')) // Hide hidden dirs
      .filter(entry => entry.name.toLowerCase().startsWith(prefix.toLowerCase()))
      .slice(0, 20)
      .map(entry => join(parentDir, entry.name));

    res.json({
      suggestions,
      isValid: true,
      parentExists: true
    });
  } catch (error) {
    console.error('Error reading directories:', error);
    res.status(500).json({ error: 'Failed to read directories' });
  }
});

// Serve static files from dist folder
app.use(express.static(join(__dirname, 'dist')));

// ============================================
// WebSocket for Terminal with Task Tracking
// ============================================

const terminalSessions = new Map();

// Broadcast to sessions viewing a specific task
function broadcastToTask(taskId, type, data) {
  const message = JSON.stringify({ type, data });
  terminalSessions.forEach((session) => {
    if (session.currentTaskId === taskId && session.ws.readyState === 1) {
      session.ws.send(message);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  const sessionId = Date.now().toString();
  let currentProcess = null;
  let inputBuffer = '';
  let currentTaskId = null;
  let currentRunDir = __dirname; // Default to server directory

  const sendOutput = (data) => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'output', data }));
    }
  };

  // Welcome message
  sendOutput('\x1b[32m╭─────────────────────────────────────╮\x1b[0m\r\n');
  sendOutput('\x1b[32m│       Gemini Kanban Board Terminal          │\x1b[0m\r\n');
  sendOutput('\x1b[32m╰─────────────────────────────────────╯\x1b[0m\r\n\r\n');
  sendOutput(`\x1b[33mWorking directory: ${__dirname}\x1b[0m\r\n\r\n`);
  sendOutput('\x1b[33mType commands to execute. Try:\x1b[0m\r\n');
  sendOutput('  \x1b[36mgemini\x1b[0m          - Start Gemini CLI\r\n');
  sendOutput('  \x1b[36mgemini -y -p "..."\x1b[0m - Run a prompt (auto-confirm)\r\n');
  sendOutput('  \x1b[36mls, pwd, etc.\x1b[0m   - Shell commands\r\n\r\n');
  sendOutput('\x1b[32m$ \x1b[0m');

  // Initial session registration
  const session = { ws, currentProcess, currentTaskId };
  terminalSessions.set(sessionId, session);

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString());

      switch (msg.type) {
        case 'start_task': {
          const taskId = msg.taskId;
          const task = tasks.find(t => t.id === taskId);

          if (task) {
            currentTaskId = taskId;
            session.currentTaskId = taskId;

            const runDir = join(RUNS_DIR, `${taskId}_${Date.now()}`);
            mkdirSync(runDir, { recursive: true });
            currentRunDir = runDir;

            const logFile = join(runDir, 'task.log');
            const logToFile = (text) => {
              try {
                const cleanText = text.replace(/\x1b\[[0-9;]*m/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '');
                appendFileSync(logFile, cleanText);
              } catch (e) {
                console.error('Failed to write to log:', e);
              }
            };

            task.runDir = runDir;
            task.status = 'in_progress';
            task.updatedAt = new Date().toISOString();
            saveTasks(tasks);
            broadcast({ type: 'task:updated', task });


            // Handle Custom Role / System Prompt
            let envOverrides = {};
            let roleName = 'Default';
            if (task.roleId) {
              const role = roles.find(r => r.id === task.roleId);
              if (role) {
                roleName = role.name;
                const systemPromptFile = join(runDir, 'system.md');
                writeFileSync(systemPromptFile, role.systemPrompt);
                envOverrides = {
                  GEMINI_SYSTEM_MD: systemPromptFile
                };
              }
            }

            logToFile(`=== Task: ${task.title} ===\n`);
            logToFile(`Started: ${new Date().toISOString()}\n`);
            logToFile(`Role: ${roleName}\n`);
            logToFile(`Working Directory: ${task.workingDirectory || runDir}\n`);
            logToFile(`Prompt: ${msg.prompt}\n`);
            logToFile(`---\n`);

            broadcastToTask(taskId, 'output', `\r\n\x1b[33m━━━ Starting Task: ${task.title} ━━━\x1b[0m\r\n`);
            broadcastToTask(taskId, 'output', `\x1b[36mRole: ${roleName}\x1b[0m\r\n`);
            broadcastToTask(taskId, 'output', `\x1b[36mRun directory: ${runDir}\x1b[0m\r\n\r\n`);

            const cmd = `gemini -y -p "${msg.prompt.replace(/"/g, '\\"')}"`;
            broadcastToTask(taskId, 'output', `\x1b[32m$ \x1b[0m${cmd}\r\n`);

            const executionDir = task.workingDirectory || currentRunDir;

            try {
              const execEnv = {
                ...process.env,
                ...envOverrides,
                TERM: 'xterm-256color',
                PATH: `/usr/local/bin:/usr/bin:/bin:/sbin:/usr/sbin:/opt/homebrew/bin:/home/linuxbrew/.linuxbrew/bin:${process.env.PATH || ''}`
              };

              currentProcess = exec(cmd, {
                cwd: executionDir,
                env: execEnv,
                maxBuffer: 50 * 1024 * 1024,
              });
              session.currentProcess = currentProcess;

              currentProcess.stdout.on('data', (chunk) => {
                const output = chunk.toString();
                broadcastToTask(taskId, 'output', output.replace(/\n/g, '\r\n'));
                logToFile(output);
              });

              currentProcess.stderr.on('data', (chunk) => {
                const output = chunk.toString();
                broadcastToTask(taskId, 'output', '\x1b[31m' + output.replace(/\n/g, '\r\n') + '\x1b[0m');
                logToFile('[STDERR] ' + output);
              });

              currentProcess.on('close', (code) => {
                const completionMsg = `━━━ Task completed (exit: ${code}) ━━━`;
                logToFile(`\n---\n${completionMsg}\nCompleted: ${new Date().toISOString()}\nExit code: ${code}\n`);
                updateTaskStatus(taskId, 'done', code);
                broadcastToTask(taskId, 'output', `\x1b[32m${completionMsg}\x1b[0m\r\n\x1b[32m$ \x1b[0m`);

                // Clear state for this session
                currentProcess = null;
                session.currentProcess = null;
              });

              currentProcess.on('error', (err) => {
                const errOutput = `\x1b[31mError: ${err.message}\x1b[0m\r\n\x1b[32m$ \x1b[0m`;
                broadcastToTask(taskId, 'output', errOutput);
                updateTaskStatus(taskId, 'done', -1);
                currentProcess = null;
                session.currentProcess = null;
              });
            } catch (err) {
              const errOutput = `\x1b[31mError: ${err.message}\x1b[0m\r\n\x1b[32m$ \x1b[0m`;
              broadcastToTask(taskId, 'output', errOutput);
              updateTaskStatus(taskId, 'done', -1);
            }
          }
          break;
        }

        case 'attach_task': {
          const { taskId } = msg;
          currentTaskId = taskId;
          session.currentTaskId = taskId; // Track taskId for this session

          const task = tasks.find(t => t.id === taskId);
          if (task && task.runDir) {
            const logFile = join(task.runDir, 'task.log');
            if (existsSync(logFile)) {
              try {
                const logs = readFileSync(logFile, 'utf-8');
                sendOutput(logs.replace(/\n/g, '\r\n'));
              } catch (e) {
                console.error('Failed to read log file:', e);
              }
            }
          }
          break;
        }

        case 'input':
        case 'inject': {
          const data = msg.data;
          if (data === '\r' || data === '\n') {
            sendOutput('\r\n');
            if (inputBuffer.trim()) {
              const cmd = inputBuffer.trim();
              inputBuffer = '';
              try {
                const execEnv = {
                  ...process.env,
                  TERM: 'xterm-256color',
                  PATH: `/usr/local/bin:/usr/bin:/bin:/sbin:/usr/sbin:/opt/homebrew/bin:/home/linuxbrew/.linuxbrew/bin:${process.env.PATH || ''}`
                };
                const shellProcess = exec(cmd, {
                  cwd: currentRunDir,
                  env: execEnv,
                  maxBuffer: 50 * 1024 * 1024,
                });
                shellProcess.stdout.on('data', (chunk) => sendOutput(chunk.toString().replace(/\n/g, '\r\n')));
                shellProcess.stderr.on('data', (chunk) => sendOutput('\x1b[31m' + chunk.toString().replace(/\n/g, '\r\n') + '\x1b[0m'));
                shellProcess.on('close', (code) => {
                  if (code !== 0) sendOutput(`\x1b[33m[Exit code: ${code}]\x1b[0m\r\n`);
                  sendOutput('\x1b[32m$ \x1b[0m');
                });
              } catch (err) {
                sendOutput(`\x1b[31mError: ${err.message}\x1b[0m\r\n\x1b[32m$ \x1b[0m`);
              }
            } else {
              sendOutput('\x1b[32m$ \x1b[0m');
            }
          } else if (data === '\x7f' || data === '\b') {
            if (inputBuffer.length > 0) {
              inputBuffer = inputBuffer.slice(0, -1);
              sendOutput('\b \b');
            }
          } else if (data === '\x03') {
            if (currentProcess) {
              currentProcess.kill('SIGINT');
              sendOutput('^C\r\n');
            } else {
              sendOutput('^C\r\n\x1b[32m$ \x1b[0m');
              inputBuffer = '';
            }
          } else if (data.charCodeAt(0) >= 32 || data === '\t') {
            inputBuffer += data;
            sendOutput(data);
          }
          break;
        }
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // ONLY kill processes that ARE NOT tasks (shell processes started via direct input)
    // If currentTaskId is set, it means this session was viewing a task.
    // We want task processes to persist until they finish.
    if (currentProcess && !currentTaskId) {
      currentProcess.kill();
    }
    terminalSessions.delete(sessionId);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

// Fallback to index.html for SPA routing
app.get('/{*splat}', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`WebSocket available on ws://${HOST}:${PORT}`);
  console.log(`Tasks stored in ${TASKS_FILE}`);
  console.log(`Roles stored in ${ROLES_FILE}`);
  console.log(`Run directories in ${RUNS_DIR}`);
});
