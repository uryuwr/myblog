import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './LoginModal.css';

const LoginModal = ({ isOpen, onClose, onSuccess }) => {
  const { sendCode, verify } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  const emailInputRef = useRef(null);
  const codeInputRef = useRef(null);

  // 自动聚焦
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (step === 'email') {
          emailInputRef.current?.focus();
        } else {
          codeInputRef.current?.focus();
        }
      }, 100);
    }
  }, [isOpen, step]);

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setEmail('');
        setCode('');
        setStep('email');
        setError('');
        setLoading(false);
      }, 300);
    }
  }, [isOpen]);

  // 发送验证码
  const handleSendCode = async (e) => {
    e?.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await sendCode(email);
      setStep('code');
      setCountdown(60); // 60秒后可重发
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 验证登录
  const handleVerify = async (e) => {
    e?.preventDefault();
    
    if (!code || code.length !== 6) {
      setError('请输入 6 位验证码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verify(email, code);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 返回上一步
  const handleBack = () => {
    setStep('email');
    setCode('');
    setError('');
  };

  // 按 ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal" onClick={(e) => e.stopPropagation()}>
        <button className="login-modal-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>

        <div className="login-modal-header">
          <div className="login-modal-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M20 19.59V8l-6-6H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c.45 0 .85-.15 1.19-.4l-4.43-4.43c-.8.52-1.76.83-2.76.83-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5c0 1-.3 1.96-.83 2.75L20 19.59zM9 13c0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3-3 1.34-3 3z"/>
            </svg>
          </div>
          <h2>终端登录</h2>
          <p>使用邮箱验证码登录以访问终端</p>
        </div>

        {step === 'email' ? (
          <form className="login-form" onSubmit={handleSendCode}>
            <div className="form-group">
              <label htmlFor="email">邮箱地址</label>
              <input
                ref={emailInputRef}
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <button 
              type="submit" 
              className="login-btn primary"
              disabled={loading || !email}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  发送中...
                </>
              ) : (
                '获取验证码'
              )}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleVerify}>
            <div className="form-group">
              <label>验证码已发送至</label>
              <div className="email-display">{email}</div>
            </div>

            <div className="form-group">
              <label htmlFor="code">验证码</label>
              <input
                ref={codeInputRef}
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6 位数字验证码"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                disabled={loading}
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <button 
              type="submit" 
              className="login-btn primary"
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  验证中...
                </>
              ) : (
                '登录'
              )}
            </button>

            <div className="form-actions">
              <button 
                type="button" 
                className="link-btn"
                onClick={handleBack}
              >
                ← 修改邮箱
              </button>
              <button 
                type="button" 
                className="link-btn"
                onClick={handleSendCode}
                disabled={countdown > 0 || loading}
              >
                {countdown > 0 ? `重新发送 (${countdown}s)` : '重新发送'}
              </button>
            </div>
          </form>
        )}

        <div className="login-modal-footer">
          <p>登录即表示您同意使用终端功能</p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
