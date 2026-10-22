import { getWsUrl } from './config';

/**
 * Live connection to the server. The server announces changes over two WebSockets; this turns each
 * message into a browser event so any screen can refresh itself:
 *   - /ws/notifications/ -> "cp:notification"      (a new notification for me)
 *   - /ws/workspace/     -> "cp:workspace-update"  (someone changed a task, project, ...)
 * Connections reconnect on their own, and every screen still has a slow poll as a fallback.
 */
export function startRealtime(): () => void {
  let stopped = false;
  const sockets: WebSocket[] = [];

  const open = (path: string, eventName: string, attempt = 0) => {
    if (stopped) return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(getWsUrl(path));
    } catch {
      return;
    }
    sockets.push(ws);
    ws.onmessage = () => window.dispatchEvent(new Event(eventName));
    ws.onclose = () => {
      if (stopped) return;
      // back off: 2s, 4s, 8s ... up to 30s
      setTimeout(() => open(path, eventName, attempt + 1), Math.min(30000, 2000 * 2 ** attempt));
    };
  };

  open('/ws/notifications/', 'cp:notification');
  open('/ws/workspace/', 'cp:workspace-update');

  return () => {
    stopped = true;
    sockets.forEach((s) => s.close());
  };
}
