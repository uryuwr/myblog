import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useAuth } from '../../contexts/AuthContext';
import { useTerminal } from '../../contexts/TerminalContext';
import LoginModal from '../LoginModal/LoginModal';
import '@xterm/xterm/css/xterm.css';
import './Terminal.css';

const Terminal = ({ onActivityChange }) => {
  const { token } = useAuth();
  const { isConnected, authStatus, sendMessage, addMessageHandler, wsRef } = useTerminal();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imeInput, setImeInput] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  
  // 语音输入状态
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // 麦克风拖动状态
  const [micPosition, setMicPosition] = useState({ x: 16, y: 16 });
  const [isDraggingMic, setIsDraggingMic] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const terminalRef = useRef(null);

  const activityTimeoutRef = useRef(null);
  const lastTapRef = useRef(0); // 双击检测
  
  const terminalContainerRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const imeInputRef = useRef(null);

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
    
    // 延迟 fit 确保容器尺寸正确
    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // 用户输入 -> WebSocket
    xterm.onData((data) => {
      sendMessage({ type: 'input', data });
    });

    // 发送 resize 消息的函数
    const sendResize = () => {
      if (xtermRef.current && fitAddonRef.current) {
        fitAddonRef.current.fit();
        sendMessage({
          type: 'resize',
          cols: xtermRef.current.cols,
          rows: xtermRef.current.rows
        });
      }
    };

    // 窗口大小改变时调整终端
    const handleResize = () => {
      sendResize();
    };

    // 页面可见性变化时重新同步尺寸
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 延迟执行，确保布局已更新
        setTimeout(sendResize, 100);
      }
    };

    // 使用 ResizeObserver 监听容器尺寸变化（更可靠）
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && terminalContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        // 防抖处理
        clearTimeout(resizeObserver._debounceTimer);
        resizeObserver._debounceTimer = setTimeout(sendResize, 50);
      });
      resizeObserver.observe(terminalContainerRef.current);
    }

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      xterm.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sendMessage]);

  // 处理来自 Context 的消息
  useEffect(() => {
    const handleMessage = (message) => {
      if (!xtermRef.current) return;

      // 检测活动状态 - 收到输出时标记为工作中
      if (message.type === 'output' && onActivityChange) {
        onActivityChange(true);
        // 清除之前的定时器
        if (activityTimeoutRef.current) {
          clearTimeout(activityTimeoutRef.current);
        }
        // 1.5秒无输出后恢复常态
        activityTimeoutRef.current = setTimeout(() => {
          onActivityChange(false);
        }, 1500);
      }

      switch (message.type) {
        case 'auth_required':
          if (!token) {
            xtermRef.current.writeln('\x1b[33m请登录以使用终端功能\x1b[0m');
            xtermRef.current.writeln('\x1b[90m点击上方区域打开登录窗口\x1b[0m\r\n');
          }
          break;

        case 'auth_success':
          if (message.restored) {
            // 会话恢复，简短提示
            xtermRef.current.writeln(`\x1b[32m✓ 会话已恢复\x1b[0m\r\n`);
          } else if (message.autoStarting) {
            // 自动启动 Claude，显示加载提示
            xtermRef.current.writeln(`\x1b[36m🐱 皮维斯正在启动中...\x1b[0m\r\n`);
          } else {
            xtermRef.current.writeln(`\x1b[32m✓ 已登录: ${message.email}\x1b[0m`);
            xtermRef.current.writeln(`\x1b[36m[${message.message}]\x1b[0m\r\n`);
          }
          
          // 重新调整终端尺寸并发送到服务端
          if (fitAddonRef.current) {
            // 延迟执行，确保 PTY 绑定完成
            setTimeout(() => {
              fitAddonRef.current.fit();
              sendMessage({
                type: 'resize',
                cols: xtermRef.current.cols,
                rows: xtermRef.current.rows
              });
            }, 200);
          }
          break;

        case 'claude_ready':
          // Claude 已准备好，可以开始使用
          xtermRef.current.writeln(`\x1b[32m✨ 皮维斯已就绪，开始工作吧！\x1b[0m\r\n`);
          // 重新调整终端大小，修复光标位置
          if (fitAddonRef.current) {
            fitAddonRef.current.fit();
            sendMessage({
              type: 'resize',
              cols: xtermRef.current.cols,
              rows: xtermRef.current.rows
            });
          }
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
    return () => {
      unsubscribe();
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [addMessageHandler, sendMessage, token, onActivityChange]);

  // WebSocket 连接状态变化时同步终端尺寸
  useEffect(() => {
    if (isConnected && fitAddonRef.current && xtermRef.current) {
      // 连接成功后延迟同步尺寸
      const timer = setTimeout(() => {
        fitAddonRef.current.fit();
        sendMessage({
          type: 'resize',
          cols: xtermRef.current.cols,
          rows: xtermRef.current.rows
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isConnected, sendMessage]);

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

    // 全屏模式时锁定 body 滚动
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }

    return () => {
      clearTimeout(timer);
      // 清理
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
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

  // IME 输入处理（中文等需要组合的输入）
  const handleImeInput = useCallback((e) => {
    const value = e.target.value;
    
    // 组合输入中，只更新状态不发送
    if (isComposing) {
      setImeInput(value);
      return;
    }
    
    // 非组合输入时，发送新增的字符
    if (value.length > imeInput.length) {
      const newChar = value.slice(imeInput.length);
      sendMessage({ type: 'input', data: newChar });
    }
    
    setImeInput(value);
  }, [imeInput, isComposing, sendMessage]);

  const handleImeKeyDown = useCallback((e) => {
    // 组合输入中不处理按键
    if (isComposing) return;
    
    const key = e.key;
    
    // 处理特殊按键
    switch (key) {
      case 'Enter':
        e.preventDefault();
        sendMessage({ type: 'input', data: '\r' });
        setImeInput('');
        break;
      case 'Backspace':
        if (imeInput.length === 0) {
          e.preventDefault();
          sendMessage({ type: 'input', data: '\x7f' });
        }
        break;
      case 'Tab':
        e.preventDefault();
        sendMessage({ type: 'input', data: e.shiftKey ? '\x1b[Z' : '\t' });
        break;
      case 'Escape':
        e.preventDefault();
        sendMessage({ type: 'input', data: '\x1b' });
        break;
      case 'ArrowUp':
        e.preventDefault();
        sendMessage({ type: 'input', data: '\x1b[A' });
        break;
      case 'ArrowDown':
        e.preventDefault();
        sendMessage({ type: 'input', data: '\x1b[B' });
        break;
      case 'ArrowLeft':
        e.preventDefault();
        sendMessage({ type: 'input', data: '\x1b[D' });
        break;
      case 'ArrowRight':
        e.preventDefault();
        sendMessage({ type: 'input', data: '\x1b[C' });
        break;
      default:
        // 处理 Ctrl 组合键
        if (e.ctrlKey && key.length === 1) {
          e.preventDefault();
          const char = key.toLowerCase();
          const ctrlCode = char.charCodeAt(0) - 96; // a=1, b=2, c=3...
          if (ctrlCode >= 1 && ctrlCode <= 26) {
            sendMessage({ type: 'input', data: String.fromCharCode(ctrlCode) });
          }
        }
    }
  }, [imeInput, isComposing, sendMessage]);

  const handleCompositionStart = () => setIsComposing(true);
  
  const handleCompositionEnd = useCallback((e) => {
    setIsComposing(false);
    const composedText = e.data;
    if (composedText) {
      sendMessage({ type: 'input', data: composedText });
    }
    setImeInput('');
  }, [sendMessage]);

  // 发送特殊按键
  const sendSpecialKey = useCallback((key) => {
    const keyMap = {
      'esc': '\x1b',
      'tab': '\t',
      'shift-tab': '\x1b[Z',  // Shift+Tab
      'enter': '\r',
      'ctrl-c': '\x03',
      'ctrl-t': '\x14',
      'ctrl-g': '\x07',  // Ctrl+G
      'ctrl-u': '\x15',
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

  // ========== 语音输入功能 ==========
  
  // 获取 API 地址
  const getApiBaseUrl = useCallback(() => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    const host = window.location.hostname;
    return `http://${host}:3001/api`;
  }, []);

  // 检查是否支持语音输入
  const checkVoiceSupport = useCallback(() => {
    const isSecure = window.isSecureContext || 
                     window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1';
    
    if (!isSecure) {
      return { supported: false, reason: '语音输入需要 HTTPS 或 localhost 访问' };
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { supported: false, reason: '您的浏览器不支持语音输入' };
    }
    
    if (typeof MediaRecorder === 'undefined') {
      return { supported: false, reason: '您的浏览器不支持录音功能' };
    }
    
    return { supported: true };
  }, []);
  
  // 开始录音
  const startRecording = useCallback(async () => {
    if (!token) {
      xtermRef.current?.writeln('\x1b[33m请先登录以使用语音输入\x1b[0m');
      return;
    }

    const support = checkVoiceSupport();
    if (!support.supported) {
      xtermRef.current?.writeln(`\x1b[31m${support.reason}\x1b[0m`);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 选择支持的音频格式
      const mimeTypes = ['audio/mp4', 'audio/webm', 'audio/ogg'];
      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, selectedMimeType ? { mimeType: selectedMimeType } : {});
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await processAudioToText();
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      xtermRef.current?.write('\x1b[36m🎤 录音中... (再次点击停止)\x1b[0m');
    } catch (error) {
      console.error('录音失败:', error);
      xtermRef.current?.writeln(`\x1b[31m无法启动录音: ${error.message}\x1b[0m`);
    }
  }, [token, checkVoiceSupport]);
  
  // 停止录音
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      xtermRef.current?.write('\r\x1b[K\x1b[33m⏳ 识别中...\x1b[0m');
    }
  }, [isRecording]);
  
  // 处理音频转文字
  const processAudioToText = useCallback(async () => {
    if (audioChunksRef.current.length === 0) {
      setIsProcessing(false);
      return;
    }
    
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: audioChunksRef.current[0]?.type || 'audio/webm' });
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      
      const response = await fetch(`${getApiBaseUrl()}/speech-to-text`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      xtermRef.current?.write('\r\x1b[K'); // 清除 "识别中..."
      
      if (result.success && result.text) {
        // 将识别的文字发送到终端
        sendMessage({ type: 'input', data: result.text });
        xtermRef.current?.write(result.text);
      } else {
        xtermRef.current?.writeln(`\x1b[31m识别失败: ${result.error || '未知错误'}\x1b[0m`);
      }
    } catch (error) {
      console.error('语音识别错误:', error);
      xtermRef.current?.write('\r\x1b[K');
      xtermRef.current?.writeln(`\x1b[31m语音识别失败: ${error.message}\x1b[0m`);
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  }, [token, getApiBaseUrl, sendMessage]);
  
  // 切换录音状态
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else if (!isProcessing) {
      startRecording();
    }
  }, [isRecording, isProcessing, startRecording, stopRecording]);

  const toggleFullscreen = () => setIsFullscreen(prev => !prev);

  // ========== 麦克风拖动功能 ==========
  const handleMicMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    if (!terminalRef.current) return;
    const terminalRect = terminalRef.current.getBoundingClientRect();

    // 按钮中心坐标（基于 bottom 和 left）
    const btnCenterX = terminalRect.left + micPosition.x + 24; // 24 = 按钮半径
    const btnCenterY = terminalRect.bottom - micPosition.y - 24;

    setIsDraggingMic(true);
    dragOffsetRef.current = {
      x: clientX - btnCenterX,
      y: clientY - btnCenterY
    };
  }, [micPosition]);

  const handleMicMouseMove = useCallback((e) => {
    if (!isDraggingMic || !terminalRef.current) return;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const terminalRect = terminalRef.current.getBoundingClientRect();
    let newX = clientX - terminalRect.left - dragOffsetRef.current.x;
    let newY = terminalRect.bottom - clientY - dragOffsetRef.current.y;

    // 限制在终端范围内
    newX = Math.max(0, Math.min(newX, terminalRect.width - 48));
    newY = Math.max(0, Math.min(newY, terminalRect.height - 48));

    setMicPosition({ x: newX, y: newY });
  }, [isDraggingMic]);

  const handleMicMouseUp = useCallback(() => {
    setIsDraggingMic(false);
  }, []);

  // 全局监听拖动事件
  useEffect(() => {
    if (isDraggingMic) {
      window.addEventListener('mousemove', handleMicMouseMove);
      window.addEventListener('mouseup', handleMicMouseUp);
      window.addEventListener('touchmove', handleMicMouseMove, { passive: false });
      window.addEventListener('touchend', handleMicMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMicMouseMove);
        window.removeEventListener('mouseup', handleMicMouseUp);
        window.removeEventListener('touchmove', handleMicMouseMove);
        window.removeEventListener('touchend', handleMicMouseUp);
      };
    }
  }, [isDraggingMic, handleMicMouseMove, handleMicMouseUp]);

  // 点击终端区域
  const focusTerminal = useCallback(() => {
    // 移动端不在单击时弹出键盘，等待双击
    if (isMobile) {
      return;
    }
    // 桌面端聚焦到 IME 输入框以正确处理中文输入
    if (imeInputRef.current) {
      imeInputRef.current.focus();
    }
  }, [isMobile]);

  const handleLoginSuccess = useCallback(() => {
    setShowLoginModal(false);
    // Context 会自动处理认证
    const newToken = localStorage.getItem('terminal_token');
    if (newToken && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'auth', token: newToken }));
    }
  }, [wsRef]);

  // 双击检测 - 移动端双击唤起键盘
  const handleDoubleTap = useCallback((e) => {
    if (!isMobile) return;
    
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // 300ms 内算双击
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // 双击，唤起键盘
      if (imeInputRef.current) {
        imeInputRef.current.focus();
      }
      lastTapRef.current = 0; // 重置
    } else {
      lastTapRef.current = now;
    }
  }, [isMobile]);

  return (
    <div
      ref={terminalRef}
      className={`terminal ${isFullscreen ? 'fullscreen' : ''} ${isDraggingMic ? 'dragging' : ''}`}
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
        {/* 语音输入按钮 - 仅登录后显示 */}
        {token && (
          <button
            className={`voice-btn ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
            style={{
              left: `${micPosition.x}px`,
              bottom: `${micPosition.y}px`,
              right: 'auto',
              top: 'auto',
              transform: isDraggingMic ? 'scale(1.1)' : 'scale(1)',
            }}
            onMouseDown={handleMicMouseDown}
            onTouchStart={handleMicMouseDown}
            onClick={(e) => { e.stopPropagation(); toggleRecording(); }}
            title={isRecording ? '停止录音' : '语音输入'}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="spin">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
              </svg>
            )}
          </button>
        )}
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
        <div 
          ref={terminalContainerRef} 
          className="xterm-container"
          onTouchEnd={handleDoubleTap}
        />
        
        {/* IME 输入框 - 用于正确处理中文等输入法输入（移动端和桌面端通用） */}
        <input
          ref={imeInputRef}
          type="text"
          className="ime-input"
          value={imeInput}
          onChange={handleImeInput}
          onKeyDown={handleImeKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          aria-label="Terminal input"
        />
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
            <button className="vk-btn" onClick={() => sendSpecialKey('shift-tab')}>⇧Tab</button>
            <button className="vk-btn vk-enter" onClick={() => sendSpecialKey('enter')}>Enter</button>
          </div>
          <div className="virtual-keys-row">
            <button className="vk-btn vk-ctrl" onClick={() => sendSpecialKey('ctrl-c')}>^C</button>
            <button className="vk-btn vk-ctrl" onClick={() => sendSpecialKey('ctrl-t')}>^T</button>
            <button className="vk-btn vk-ctrl" onClick={() => sendSpecialKey('ctrl-g')}>^G</button>
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
