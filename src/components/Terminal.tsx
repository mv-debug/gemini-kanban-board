import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  wsRef: React.MutableRefObject<WebSocket | null>;
  task?: import('./TaskCard').Task | null;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function Terminal({ wsRef, task, onConnected, onDisconnected }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

  // 1. Initialize Terminal instance
  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      theme: {
        background: '#0a0a0f',
        foreground: '#e4e4e7',
        cursor: '#00d4aa',
        cursorAccent: '#0a0a0f',
        selectionBackground: '#00d4aa40',
        black: '#1a1a24',
        red: '#ff6b6b',
        green: '#00d4aa',
        yellow: '#ffd93d',
        blue: '#6c9eff',
        magenta: '#c792ea',
        cyan: '#89ddff',
        white: '#e4e4e7',
        brightBlack: '#52525b',
        brightRed: '#ff8a8a',
        brightGreen: '#00ffcc',
        brightYellow: '#ffe566',
        brightBlue: '#8ab4ff',
        brightMagenta: '#ddb3f8',
        brightCyan: '#a6f1ff',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    setTimeout(() => {
      fitAddon.fit();
    }, 100);

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  // 2. Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const port = window.location.port || '3001';
    const ws = new WebSocket(`${protocol}//${window.location.hostname}:${port}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsWsConnected(true);
      onConnected?.();

      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        ws.send(JSON.stringify({
          type: 'resize',
          cols: xtermRef.current.cols,
          rows: xtermRef.current.rows,
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output' && xtermRef.current) {
          xtermRef.current.write(msg.data);
        } else if (msg.type === 'exit') {
          xtermRef.current?.writeln('\r\n[Process exited]');
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    };

    ws.onclose = () => {
      setIsWsConnected(false);
      onDisconnected?.();
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Terminal data handling needs to be inside this effect to have access to 'ws'
    const dataDisposable = xtermRef.current?.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    return () => {
      dataDisposable?.dispose();
      ws.close();
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
  }, [onConnected, onDisconnected, wsRef]);

  // 3. Handle Task Attachment (when task changes or connection established)
  const taskId = task?.id;
  useEffect(() => {
    if (isWsConnected && taskId && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'attach_task',
        taskId
      }));
    }
  }, [taskId, isWsConnected, wsRef]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff6b6b]"></div>
          <div className="w-3 h-3 rounded-full bg-[#ffd93d]"></div>
          <div className="w-3 h-3 rounded-full bg-[#00d4aa]"></div>
        </div>
        <span className="text-sm text-[var(--text-secondary)]">gemini terminal</span>
        <div className="w-16"></div>
      </div>
      <div
        ref={terminalRef}
        className="flex-1 p-2 bg-[var(--bg-primary)]"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}
