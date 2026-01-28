import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

// API 基础地址
const getApiUrl = () => {
  const host = window.location.hostname;
  return `http://${host}:3001`;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('terminal_token'));
  const [loading, setLoading] = useState(true);

  // 验证现有 Token
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${getApiUrl()}/api/auth/verify-token`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.valid) {
          setUser({ email: data.email });
        } else {
          // Token 无效，清除
          localStorage.removeItem('terminal_token');
          setToken(null);
        }
      } catch (error) {
        console.error('Token 验证失败:', error);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  // 发送验证码
  const sendCode = useCallback(async (email) => {
    const response = await fetch(`${getApiUrl()}/api/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '发送失败');
    }

    return data;
  }, []);

  // 验证登录
  const verify = useCallback(async (email, code) => {
    const response = await fetch(`${getApiUrl()}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '验证失败');
    }

    // 保存 Token
    localStorage.setItem('terminal_token', data.token);
    setToken(data.token);
    setUser({ email: data.email });
    
    return data;
  }, []);

  // 登出
  const logout = useCallback(() => {
    localStorage.removeItem('terminal_token');
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    sendCode,
    verify,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
