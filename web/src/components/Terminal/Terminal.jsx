import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useAuth } from '../../contexts/AuthContext';
import { useTerminal } from '../../contexts/TerminalContext';
import LoginModal from '../LoginModal/LoginModal';
import '@xterm/xterm/css/xterm.css';
import './Terminal.css';

const Terminal = () => {
  const { token } = useAuth();
  const { isConnected, authStatus, sendMessage, addMessageHandler, wsRef } = useTerminal();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileInput, setMobileInput] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  
  const terminalContainerRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const mobileInputRef = useRef(null);

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || ('ontouchstart' in window)
        || (window.innerWidth <= 768);
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 初始化 xterm
  useEffect(() => {
    if (!terminalContainerRef.current || xtermRef.current) return;

    const xterm = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 14,
      fontFamily: '"Fira Code", "JetBrains Mono", Consolas, Monaco, monospace',
      theme: {
        background: '#0D0D15',
        foreground: '#E4E4E7',
        cursor: '#00D9FF',
        cursorAccent: '#0D0D15',
        selectionBackground: 'rgba(0, 217, 255, 0.3)',
        black: '#18181B',
        red: '#F87171',
        green: '#4ADE80',
        yellow: '#FACC15',
        blue: '#60A5FA',
        magenta: '#A78BFA',
        cyan: '#00F5D4',
        white: '#E4E4E7',
        brightBlack: '#52525B',
        brightRed: '#FCA5A5',
        brightGreen: '#86EFAC',
        brightYellow: '#FCD34D',
        brightBlue: '#93C5FD',
        brightMagenta: '#C4B5FD',
        brightCyan: '#5EEAD4',
        brightWhite: '#FAFAFA',
      },
      allowTransparency: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);
    
    xterm.open(terminalContainerRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // 用户输入 -> WebSocket
    xterm.onData((data) => {
      sendMessage({ type: 'input', data });
    });

    // 窗口大小改变时调整终端
    const handleResize = () => {
      fitAddon.fit();
      sendMessage({
        type: 'resize',
        cols: xterm.cols,
        rows: xterm.rows
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      xterm.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sendMessage]);

  // 处理来自 Context 的消息
  useEffect(() => {
    const handleMessage = (message) => {
      if (!xtermRef.current) return;

      switch (message.type) {
        case 'auth_required':
          if (!token) {
            xtermRef.current.writeln('\x1b[33m请登录以使用终端功能\x1b[0m');
            xtermRef.current.writeln('\x1b[90m点击上方区域打开登录窗口\x1b[0m\r\n');
          }
          break;

        case 'auth_success':
          xtermRef.current.writeln(`\x1b[32m✓ 已登录: ${message.email}\x1b[0m`);
          xtermRef.current.writeln(`\x1b[36m[${message.message}]\x1b[0m\r\n`);
          // 发送终端大小
          sendMessage({
            type: 'resize',
            cols: xtermRef.current.cols,
            rows: xtermRef.current.rows
          });
          break;

        case 'auth_failed':
          xtermRef.current.writeln(`\x1b[31m✗ 认证失败: ${message.error}\x1b[0m`);
          xtermRef.current.writeln('\x1b[90m请重新登录\x1b[0m\r\n');
          break;

        case 'output':
          xtermRef.current.write(message.data);
          break;
        
        case 'connected':
          xtermRef.current.writeln(`\x1b[36m[${message.message}]\x1b[0m`);
          break;
        
        case 'exit':
          xtermRef.current.writeln(`\r\n\x1b[33m[进程已退出，代码: ${message.code}]\x1b[0m`);
          break;
        
        case 'error':
          xtermRef.current.writeln(`\r\n\x1b[31m[错误: ${message.error}]\x1b[0m`);
          break;

        case 'disconnected':
          xtermRef.current.writeln(`\r\n\x1b[33m[连接已断开，${message.delay / 1000} 秒后重连...]\x1b[0m`);
          break;
        
        default:
          break;
      }
    };

    const unsubscribe = addMessageHandler(handleMessage);
    return unsubscribe;
  }, [addMessageHandler, sendMessage, token]);

  // 全屏模式变化时重新调整大小
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        sendMessage({
          type: 'resize',
          cols: xtermRef.current.cols,
          rows: xtermRef.current.rows
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isFullscreen, sendMessage]);

  // 监听 Escape 键退出全屏
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // 移动端输入处理
  const handleMobileInput = useCallback((e) => {
    const value = e.target.value;
    
    if (isComposing) {
      setMobileInput(value);
      return;
    }
    
    if (value.length > mobileInput.length) {
      const newChar = value.slice(mobileInput.length);
      sendMessage({ type: 'input', data: newChar });
    }
    
    setMobileInput(value);
  }, [mobileInput, isComposing, sendMessage]);

  const handleMobileKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage({ type: 'input', data: '\r' });
      setMobileInput('');
    } else if (e.key === 'Backspace' && mobileInput.length === 0) {
      sendMessage({ type: 'input', data: '\x7f' });
    }
  }, [mobileInput, sendMessage]);

  const handleCompositionStart = () => setIsComposing(true);
  
  const handleCompositionEnd = useCallback((e) => {
    setIsComposing(false);
    const composedText = e.data;
    if (composedText) {
      sendMessage({ type: 'input', data: composedText });
    }
    setMobileInput('');
  }, [sendMessage]);

  // 发送特殊按键
  const sendSpecialKey = useCallback((key) => {
    const keyMap = {
      'esc': '\x1b',
      'tab': '\t',
      'ctrl-c': '\x03',
      'ctrl-d': '\x04',
      'ctrl-z': '\x1a',
      'ctrl-l': '\x0c',
      'up': '\x1b[A',
      'down': '\x1b[B',
      'left': '\x1b[D',
      'right': '\x1b[C',
    };
    
    if (keyMap[key]) {
      sendMessage({ type: 'input', data: keyMap[key] });
    }
  }, [sendMessage]);

  const toggleFullscreen = () => setIsFullscreen(prev => !prev);

  const focusTerminal = () => {
    if (isMobile && mobileInputRef.current) {
      mobileInputRef.current.focus();
    } else if (xtermRef.current) {
      xtermRef.current.focus();
    }
  };

  const handleLoginSuccess = useCallback(() => {
    setShowLoginModal(false);
    // Context 会自动处理认证
    const newToken = localStorage.getItem('terminal_token');
    if (newToken && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'auth', token: newToken }));
    }
  }, [wsRef]);

  return (
    <div 
      className={`terminal ${isFullscreen ? 'fullscreen' : ''}`} 
      onClick={focusTerminal}
    >
      <div className="terminal-bar">
        <div className="terminal-dots">
          <span className="dot red"></span>
          <span className="dot yellow"></span>
          <span className="dot green"></span>
        </div>
        <div className="terminal-title-area">
          <span className="terminal-title">terminal (PTY)</span>
          <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '●' : '○'}
          </span>
        </div>
        <button 
          className="fullscreen-btn" 
          onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
          title={isFullscreen ? '退出全屏 (Esc)' : '全屏'}
        >
          {isFullscreen ? (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
          )}
        </button>
      </div>

      <div className="terminal-content">
        <div ref={terminalContainerRef} className="xterm-container" />
        
        {/* 移动端输入框 */}
        {isMobile && (
          <input
            ref={mobileInputRef}
            type="text"
            className="mobile-input"
            value={mobileInput}
            onChange={handleMobileInput}
            onKeyDown={handleMobileKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            aria-label="Terminal input"
          />
        )}
      </div>

      {/* 未登录提示 */}
      {!token && isConnected && authStatus === 'idle' && (
        <div className="terminal-overlay login-prompt" onClick={() => setShowLoginModal(true)}>
          <div className="login-message">
            🔐 点击登录以使用终端
          </div>
        </div>
      )}

      {/* 连接中/认证中提示 */}
      {!isConnected && (
        <div className="terminal-overlay">
          <div className="connecting-message">
            正在连接...
          </div>
        </div>
      )}

      {token && isConnected && authStatus === 'authenticating' && (
        <div className="terminal-overlay">
          <div className="connecting-message">
            正在验证身份...
          </div>
        </div>
      )}

      {/* 登录弹窗 */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />
      
      {/* 移动端虚拟按键 */}
      {isMobile && (
        <div className="virtual-keys">
          <div className="virtual-keys-row">
            <button className="vk-btn" onClick={() => sendSpecialKey('esc')}>Esc</button>
            <button className="vk-btn" onClick={() => sendSpecialKey('tab')}>Tab</button>
            <button className="vk-btn vk-ctrl" onClick={() => sendSpecialKey('ctrl-c')}>^C</button>
            <button className="vk-btn vk-ctrl" onClick={() => sendSpecialKey('ctrl-d')}>^D</button>
            <button className="vk-btn vk-ctrl" onClick={() => sendSpecialKey('ctrl-z')}>^Z</button>
            <button className="vk-btn vk-ctrl" onClick={() => sendSpecialKey('ctrl-l')}>^L</button>
          </div>
          <div className="virtual-keys-row">
            <button className="vk-btn vk-arrow" onClick={() => sendSpecialKey('up')}>↑</button>
            <button className="vk-btn vk-arrow" onClick={() => sendSpecialKey('down')}>↓</button>
            <button className="vk-btn vk-arrow" onClick={() => sendSpecialKey('left')}>←</button>
            <button className="vk-btn vk-arrow" onClick={() => sendSpecialKey('right')}>→</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Terminal;
