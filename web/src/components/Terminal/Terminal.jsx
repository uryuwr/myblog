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

  // 键盘按钮拖动状态（右侧，与麦克风对称）
  const [kbdPosition, setKbdPosition] = useState({ x: 16, y: 16 });
  const [isDraggingKbd, setIsDraggingKbd] = useState(false);
  const kbdDragOffsetRef = useRef({ x: 0, y: 0 });

  // 移动端悬浮输入框状态
  const [showFloatingInput, setShowFloatingInput] = useState(false);
  const [floatingInputValue, setFloatingInputValue] = useState('');
  const floatingInputRef = useRef(null);
  
  // 跟踪终端当前输入行内容（用于同步悬浮输入框）
  const currentInputRef = useRef('');

  // Danger 模式状态（跳过权限确认）
  const [isDangerMode, setIsDangerMode] = useState(false);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);

  const activityTimeoutRef = useRef(null);
  
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

    return () => {
      clearTimeout(timer);
    };
  }, [sendMessage]);

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

  // 切换 Danger 模式
  const toggleDangerMode = useCallback(() => {
    if (isSwitchingMode) return;
    
    setIsSwitchingMode(true);
    const newMode = !isDangerMode;
    
    // 1. 发送 Ctrl+C 退出当前 claude
    sendMessage({ type: 'input', data: '\x03' });
    
    // 2. 等待 500ms 让 claude 退出
    setTimeout(() => {
      // 3. 发送新的启动命令
      const cmd = newMode ? 'claude --dangerously-skip-permissions' : 'claude';
      sendMessage({ type: 'input', data: cmd + '\r' });
      
      setIsDangerMode(newMode);
      setIsSwitchingMode(false);
    }, 500);
  }, [isDangerMode, isSwitchingMode, sendMessage]);

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
        // 更新输入跟踪
        currentInputRef.current = currentInputRef.current + result.text;
        
        // 如果悬浮输入框是打开的，将文字填入输入框供用户编辑
        if (showFloatingInput) {
          setFloatingInputValue(currentInputRef.current);
          // 聚焦到输入框
          setTimeout(() => floatingInputRef.current?.focus(), 100);
        }
        
        // 始终发送到终端（让终端显示）
        sendMessage({ type: 'input', data: result.text });
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

  // ========== 键盘按钮拖动功能 ==========
  const handleKbdMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    if (!terminalRef.current) return;
    const terminalRect = terminalRef.current.getBoundingClientRect();

    // 按钮中心坐标（基于 bottom 和 right）
    const btnCenterX = terminalRect.right - kbdPosition.x - 24;
    const btnCenterY = terminalRect.bottom - kbdPosition.y - 24;

    setIsDraggingKbd(true);
    kbdDragOffsetRef.current = {
      x: clientX - btnCenterX,
      y: clientY - btnCenterY
    };
  }, [kbdPosition]);

  const handleKbdMouseMove = useCallback((e) => {
    if (!isDraggingKbd || !terminalRef.current) return;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const terminalRect = terminalRef.current.getBoundingClientRect();
    let newX = terminalRect.right - clientX - kbdDragOffsetRef.current.x;
    let newY = terminalRect.bottom - clientY - kbdDragOffsetRef.current.y;

    // 限制在终端范围内
    newX = Math.max(0, Math.min(newX, terminalRect.width - 48));
    newY = Math.max(0, Math.min(newY, terminalRect.height - 48));

    setKbdPosition({ x: newX, y: newY });
  }, [isDraggingKbd]);

  const handleKbdMouseUp = useCallback(() => {
    setIsDraggingKbd(false);
  }, []);

  // 键盘按钮点击 - 显示悬浮输入框
  const handleKbdClick = useCallback((e) => {
    e.stopPropagation();
    // 打开时从终端同步当前输入内容
    setFloatingInputValue(currentInputRef.current);
    setShowFloatingInput(true);
    
    requestAnimationFrame(() => {
      setTimeout(() => {
        floatingInputRef.current?.focus();
      }, 50);
    });
  }, []);

  // 悬浮输入框 - 输入变化时实时同步到终端
  const handleFloatingInputChange = useCallback((e) => {
    const newValue = e.target.value;
    const oldValue = floatingInputValue;
    
    if (!sendMessage) {
      setFloatingInputValue(newValue);
      currentInputRef.current = newValue;
      return;
    }
    
    // 计算差异并发送到终端
    if (newValue.length > oldValue.length) {
      // 输入了新字符
      const addedChars = newValue.slice(oldValue.length);
      sendMessage({ type: 'input', data: addedChars });
    } else if (newValue.length < oldValue.length) {
      // 删除了字符（退格）
      const deletedCount = oldValue.length - newValue.length;
      for (let i = 0; i < deletedCount; i++) {
        sendMessage({ type: 'input', data: '\x7f' }); // 发送退格
      }
    }
    
    setFloatingInputValue(newValue);
    currentInputRef.current = newValue;
  }, [floatingInputValue, sendMessage]);

  // 悬浮输入框 - 发送回车
  const handleFloatingInputSubmit = useCallback(() => {
    if (sendMessage) {
      sendMessage({ type: 'input', data: '\r' });
      setFloatingInputValue('');
      currentInputRef.current = ''; // 提交后清空输入跟踪
      setShowFloatingInput(false);
    }
  }, [sendMessage]);

  // 悬浮输入框 - 关闭（保留输入内容，以便下次打开时恢复）
  const handleFloatingInputClose = useCallback(() => {
    setShowFloatingInput(false);
    // 不清空 floatingInputValue，保留用户输入
  }, []);

  // 全局监听键盘按钮拖动事件
  useEffect(() => {
    if (isDraggingKbd) {
      window.addEventListener('mousemove', handleKbdMouseMove);
      window.addEventListener('mouseup', handleKbdMouseUp);
      window.addEventListener('touchmove', handleKbdMouseMove, { passive: false });
      window.addEventListener('touchend', handleKbdMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleKbdMouseMove);
        window.removeEventListener('mouseup', handleKbdMouseUp);
        window.removeEventListener('touchmove', handleKbdMouseMove);
        window.removeEventListener('touchend', handleKbdMouseUp);
      };
    }
  }, [isDraggingKbd, handleKbdMouseMove, handleKbdMouseUp]);

  return (
    <div
      ref={terminalRef}
      className={`terminal ${isDraggingMic || isDraggingKbd ? 'dragging' : ''}`}
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
        {/* Danger 模式切换按钮 */}
        {token && (
          <button
            className={`danger-mode-btn ${isDangerMode ? 'active' : ''} ${isSwitchingMode ? 'switching' : ''}`}
            onClick={toggleDangerMode}
            disabled={isSwitchingMode}
            title={isDangerMode ? '当前: Danger 模式 (点击切换到普通模式)' : '当前: 普通模式 (点击切换到 Danger 模式)'}
          >
            {isSwitchingMode ? '⏳' : (isDangerMode ? '⚡' : '🛡️')}
          </button>
        )}
      </div>

      <div className="terminal-content">
        <div 
          ref={terminalContainerRef} 
          className="xterm-container"
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
      
      {/* 移动端悬浮输入框 - 包含虚拟按键 */}
      {isMobile && showFloatingInput && (
        <div className="floating-input-overlay" onClick={handleFloatingInputClose}>
          <div className="floating-input-container floating-input-simple" onClick={(e) => e.stopPropagation()}>
            <div className="floating-input-header">
              <span className="floating-input-title">输入内容（实时同步）</span>
              <button className="floating-input-close" onClick={handleFloatingInputClose}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            
            <div className="floating-input-body">
              <input
                ref={floatingInputRef}
                type="text"
                className="floating-input-field"
                value={floatingInputValue}
                onChange={handleFloatingInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleFloatingInputSubmit();
                  }
                }}
                placeholder="输入内容会实时显示在终端..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                autoFocus
              />
              <button 
                className="floating-submit-btn"
                onClick={handleFloatingInputSubmit}
                title="发送回车"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19 7v4H5.83l3.58-3.59L8 6l-6 6 6 6 1.41-1.41L5.83 13H21V7z"/>
                </svg>
              </button>
            </div>
            
            {/* 虚拟按键 - 在输入框下方 */}
            <div className="floating-virtual-keys">
              <div className="floating-vk-row">
                <button className="floating-vk-btn" onClick={() => sendSpecialKey('esc')}>Esc</button>
                <button className="floating-vk-btn" onClick={() => sendSpecialKey('tab')}>Tab</button>
                <button className="floating-vk-btn" onClick={() => sendSpecialKey('ctrl-c')}>^C</button>
                <button className="floating-vk-btn floating-vk-enter" onClick={() => sendSpecialKey('enter')}>Enter</button>
              </div>
              <div className="floating-vk-row">
                <button className="floating-vk-btn floating-vk-arrow" onClick={() => sendSpecialKey('up')}>↑</button>
                <button className="floating-vk-btn floating-vk-arrow" onClick={() => sendSpecialKey('down')}>↓</button>
                <button className="floating-vk-btn floating-vk-arrow" onClick={() => sendSpecialKey('left')}>←</button>
                <button className="floating-vk-btn floating-vk-arrow" onClick={() => sendSpecialKey('right')}>→</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 移动端悬浮按钮 - fixed 定位，始终可见 */}
      {isMobile && (
        <div className="mobile-fixed-btns">
          {/* 语音输入按钮 */}
          {token && (
            <button
              className={`voice-btn ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleRecording(); }}
              title={isRecording ? '停止录音' : '语音输入'}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="spin">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
                </svg>
              )}
            </button>
          )}
          {/* 键盘按钮 */}
          <button
            className="keyboard-btn"
            onClick={handleKbdClick}
            title="唤起键盘"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default Terminal;
