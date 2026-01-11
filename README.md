# 🤖 Gemini Kanban Board

A modern web UI for controlling and orchestrating Gemini CLI tasks with an integrated terminal and task management.

[![CI](https://github.com/YOUR_USERNAME/gemini-kanban-board/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/gemini-kanban-board/actions/workflows/ci.yml)
[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-06B6D4?logo=tailwindcss)
![Tests](https://img.shields.io/badge/Tests-97%20passed-00d4aa)

## ✨ Features

- **📋 Kanban Board** – Visual task management with Todo, Running, and Done columns  
- **💻 Web Terminal** – Full xterm.js terminal with WebSocket connection  
- **📂 Custom Working Directory** – Run tasks in any directory on your system  
- **📝 Task Logging** – All task output saved to `task.log` in run directory  
- **🔄 Real-time Updates** – Live status updates via WebSocket broadcast  
- **💾 Persistence** – Task data automatically saved to `.data/tasks.json`  

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  TaskBoard   │  │   TaskCard   │  │    Terminal      │  │
│  │  (Kanban)    │  │(Single Task) │  │    (xterm.js)    │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│         └─────────────────┴────────────────────┘            │
│                           │ WebSocket                       │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│              Express + WebSocket Server                     │
│  ┌────────────────────────┴──────────────────────────────┐ │
│  │                   server.js                            │ │
│  │  • REST API for task CRUD (/api/tasks)                │ │
│  │  • WebSocket for terminal I/O + task events           │ │
│  │  • Child process spawning (gemini CLI)                │ │
│  │  • Task logging to .runs/<taskId>/task.log            │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) installed and configured

### Get API Key

To run the application (locally or in Docker), you need a Google Gemini API Key:

1.  Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Click on "Create API key".
3.  Copy the key and use it as `GEMINI_API_KEY` environment variable.

### Installation

```bash
# Install dependencies
pnpm install

# Development server (frontend only)
pnpm run dev

# Or: Production build + server
pnpm run start
```

### Docker

```bash
docker build -t auto-gemini .
docker run -p 3001:3001 auto-gemini
```

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Vite dev server with HMR |
| `pnpm run build` | TypeScript compile + production build |
| `pnpm run server` | Start Express backend |
| `pnpm run start` | Build + server (production) |
| `pnpm run lint` | Run ESLint |
| `pnpm run test` | Run tests in watch mode |
| `pnpm run test:unit` | Run unit tests with coverage |
| `pnpm run test:e2e` | Run Playwright E2E tests |
| `pnpm run test:all` | Run all tests (unit + E2E) |

## 🧪 Testing

### Unit Tests (Vitest)

```bash
pnpm run test:unit
```

- **37 tests** covering components, API, and WebSocket logic
- Coverage report generated with v8
- Tests for `TaskCard`, `TaskBoard`, `App`, API routes, and WebSocket

### E2E Tests (Playwright)

```bash
pnpm run test:e2e
```

- **60 tests** covering user flows
- Kanban board interactions
- Task creation, execution, and completion

### Run All Tests

```bash
pnpm run test:all
```

## 📁 Project Structure

```
gemini-cli-frontend/
├── src/
│   ├── App.tsx              # Main app with routing logic
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles + CSS variables
│   └── components/
│       ├── Terminal.tsx     # xterm.js WebSocket terminal
│       ├── TaskBoard.tsx    # Kanban board with 3 columns
│       └── TaskCard.tsx     # Individual task card
├── test/
│   ├── unit/                # Unit tests (Vitest)
│   └── integration/         # API & WebSocket tests
├── e2e/                     # E2E tests (Playwright)
├── server.js                # Express + WebSocket backend
├── Dockerfile               # Container image definition
├── .data/                   # Persistent task data
└── .runs/                   # Task run directories + logs
```

## 🔌 API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks` | Fetch all tasks |
| `POST` | `/api/tasks` | Create new task |
| `PUT` | `/api/tasks/:id` | Update task |
| `DELETE` | `/api/tasks/:id` | Delete task |

### Task Object

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  workingDirectory?: string;  // Custom execution directory
  runDir?: string;            // Auto-created run directory
  exitCode?: number;
}
```

### WebSocket Messages

**Client → Server:**
```typescript
// Start a task
{ type: 'start_task', taskId: string, prompt: string }

// Terminal input
{ type: 'input', data: string }
```

**Server → Client:**
```typescript
// Terminal output
{ type: 'output', data: string }

// Task events
{ type: 'task:created' | 'task:updated' | 'task:deleted', task?: Task }
```

## 🎨 Tech Stack

| Technology | Version | Usage |
|------------|---------|-------|
| React | 19.2 | UI Framework |
| TypeScript | 5.9 | Type Safety |
| Vite | 7.2 | Build Tool |
| Tailwind CSS | 4.1 | Styling |
| Express | 5.2 | HTTP Server |
| ws | 8.19 | WebSocket Server |
| xterm.js | 6.0 | Terminal Emulator |
| Vitest | 4.0 | Unit Testing |
| Playwright | 1.57 | E2E Testing |

## 📝 License

[Mozilla Public License 2.0](LICENSE)
