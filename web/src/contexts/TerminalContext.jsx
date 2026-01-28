import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

const TerminalContext = createContext(null);

// 动态获取 WebSocket 地址
const getWsUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  return `${protocol}//${host}:3001`;
};

// 生成唯一客户端 ID（用于区分不同设备/标签页）
const generateClientId = () => {
  const stored = sessionStorage.getItem('terminal_client_id');
  if (stored) return stored;
  
  const id = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  sessionStorage.setItem('terminal_client_id', id);
  return id;
};

const RECONNECT_BASE_DELAY = 3000;
const RECONNECT_MAX_DELAY = 30000;

export function TerminalProvider({ children }) {
  const { isAuthenticated, token, user, logout } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [authStatus, setAuthStatus] = useState('idle'); // 'idle' | 'authenticating' | 'authenticated' | 'failed'
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [terminalOutput, setTerminalOutput] = useState([]); // 存储终端输出历史
  
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const connectingRef = useRef(false);
  const messageHandlersRef = useRef(new Set()); // 存储消息处理器
  const clientIdRef = useRef(generateClientId()); // 唯一客户端标识

  // 计算重连延迟（指数退避）
  const getReconnectDelay = useCallback((attempt) => {
    return Math.min(RECONNECT_BASE_DELAY * Math.pow(2, attempt), RECONNECT_MAX_DELAY);
  }, []);

  // 注册消息处理器
  const addMessageHandler = useCallback((handler) => {
    messageHandlersRef.current.add(handler);
    return () => messageHandlersRef.current.delete(handler);
  }, []);

  // 广播消息给所有处理器
  const broadcastMessage = useCallback((message) => {
    messageHandlersRef.current.forEach(handler => handler(message));
  }, []);

  // 发送消息到 WebSocket
  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // 处理服务器消息
  const handleServerMessage = useCallback((message) => {
    switch (message.type) {
      case 'auth_required':
        setAuthStatus('idle');
        // 如果已登录，自动发送认证（包含客户端 ID）
        const currentToken = localStorage.getItem('terminal_token');
        if (currentToken && wsRef.current?.readyState === WebSocket.OPEN) {
          setAuthStatus('authenticating');
          wsRef.current.send(JSON.stringify({
            type: 'auth',
            token: currentToken,
            clientId: clientIdRef.current
          }));
        }
        break;
      
      case 'auth_success':
        setAuthStatus('authenticated');
        break;
      
      case 'auth_failed':
        setAuthStatus('failed');
        logout();
        break;
      
      default:
        break;
    }
    
    // 广播给终端组件
    broadcastMessage(message);
  }, [logout, broadcastMessage]);

  // 连接 WebSocket
  const connectWebSocket = useCallback(() => {
    if (connectingRef.current) {
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    connectingRef.current = true;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsUrl = getWsUrl();
    console.log('🔌 正在连接 WebSocket...', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket 已连接');
      connectingRef.current = false;
      setIsConnected(true);
      setReconnectAttempt(0);
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
      } catch (e) {
        console.error('消息解析错误:', e);
      }
    };

    ws.onclose = () => {
      console.log('❌ WebSocket 连接已断开');
      connectingRef.current = false;
      setIsConnected(false);
      setAuthStatus('idle');
      
      const delay = getReconnectDelay(reconnectAttempt);
      console.log(`📡 将在 ${delay / 1000} 秒后重连`);
      
      // 通知终端组件连接断开
      broadcastMessage({ type: 'disconnected', delay });
      
      reconnectTimerRef.current = setTimeout(() => {
        setReconnectAttempt(prev => prev + 1);
        connectWebSocket();
      }, delay);
    };

    ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
      connectingRef.current = false;
    };

    wsRef.current = ws;
  }, [reconnectAttempt, getReconnectDelay, handleServerMessage, broadcastMessage]);

  // 页面可见性变化时检查连接状态
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (connectingRef.current) {
          return;
        }
        
        if (!wsRef.current || 
            (wsRef.current.readyState !== WebSocket.OPEN && 
             wsRef.current.readyState !== WebSocket.CONNECTING)) {
          console.log('📡 页面恢复可见，重新连接...');
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
          setReconnectAttempt(0);
          connectWebSocket();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [connectWebSocket]);

  // 初始化连接（仅执行一次）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!connectingRef.current) {
        connectWebSocket();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      // 注意：我们不在这里关闭连接，因为这是全局 Provider
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 组件卸载时清理（仅在整个应用卸载时）
  useEffect(() => {
    return () => {
      connectingRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const value = {
    isConnected,
    authStatus,
    user,
    sendMessage,
    addMessageHandler,
    wsRef,
  };

  return (
    <TerminalContext.Provider value={value}>
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminal() {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminal must be used within a TerminalProvider');
  }
  return context;
}
