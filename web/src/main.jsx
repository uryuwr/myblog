import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 注意：移除 StrictMode 以避免开发模式下 WebSocket 重复连接
// 生产环境不受影响
createRoot(document.getElementById('root')).render(
  <App />
)
