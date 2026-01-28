# MyBlog 终端集成项目架构设计

## 前言

MyBlog 是一个全栈博客系统，最大的特色是将 Web Terminal 功能无缝集成到博客中，让用户可以直接在浏览器中使用命令行终端，并能运行 Claude Code CLI 工具。本文将从整体架构、技术选型、数据流转等多个维度详细介绍该系统的设计思路。

## 一、整体架构概览

项目采用前后端分离架构，包含以下核心模块：

```
┌─────────────────────────────────────────────────────────┐
│                      Client (浏览器)                     │
├─────────────────────────────────────────────────────────┤
│  React 19 + Vite                                        │
│  ├─ AuthContext (认证状态管理)                           │
│  ├─ TerminalContext (WebSocket 连接管理)                 │
│  └─ Terminal Component (xterm.js 终端)                  │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ HTTP API / WebSocket
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 Server (Node.js)                        │
├─────────────────────────────────────────────────────────┤
│  Express.js + WebSocket (ws)                             │
│  ├─ JWT Authentication (邮箱验证码登录)                    │
│  ├─ WebSocket Server (终端实时通信)                      │
│  ├─ PTY Process (node-pty, PowerShell)                 │
│  └─ RESTful API (文章、评论、草稿)                        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ SQLite
                      │
┌─────────────────────▼───────────────────────────────────┐
│              Database (better-sqlite3)                    │
├─────────────────────────────────────────────────────────┤
│  ├─ articles (文章表)                                    │
│  ├─ comments (评论表)                                    │
│  └─ drafts (草稿表)                                     │
└─────────────────────────────────────────────────────────┘
```

## 二、技术栈详解

### 2.1 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| Vite | 最新 | 构建工具 |
| React Router | v7 | 路由管理 |
| xterm.js | @xterm/xterm | Web 终端模拟 |
| lucide-react | - | 图标库 |

**核心依赖说明：**
- `@xterm/xterm`: 基于 Web 的终端模拟器，支持完整的 ANSI 转义序列
- `@xterm/addon-fit`: 自动调整终端尺寸以适应容器
- `@xterm/addon-web-links`: 终端内的链接可点击

### 2.2 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | ES Modules | 运行时环境 |
| Express.js | - | HTTP 服务器 |
| ws | - | WebSocket 服务器 |
| node-pty | - | PTY (伪终端) 进程管理 |
| JWT | - | 身份认证 |
| Nodemailer | - | 邮件发送 |
| better-sqlite3 | - | SQLite 数据库封装 |

**核心依赖说明：**
- `node-pty`: 提供与本地终端相同的完整体验，支持 Windows 上的 PowerShell
- `ws`: 轻量级 WebSocket 库，与 Express HTTP 服务器共享端口
- `better-sqlite3`: 同步的 SQLite 封装，性能优于 node-sqlite3

## 三、核心架构设计

### 3.1 认证架构

采用邮箱验证码 + JWT 的认证方案：

```
┌─────────┐    1.发送邮箱    ┌──────────┐    2.生成验证码    ┌─────────┐
│  前端   │ ────────────────> │ API 服务器 │ ───────────────> │ 内存存储 │
└─────────┘                  └──────────┘                  └─────────┘
     ▲                           │                             │
     │ 3.发送验证码邮件            │                             │
     │<────────────────────────── │                             │
     │                           │                             │
     │ 4.提交验证码               │ 5.验证验证码               │
     ───────────────────────────> ───────────────────────────> │
                                 │                             │
                                 │ 6.生成 JWT Token            │
                                 │<────────────────────────────┘
                                 │
     │ 7.返回 Token              │
     │<──────────────────────────│
     │                           │
     │ 8.存储 Token (localStorage)
     ───────────────────────────│
```

**关键设计点：**
1. **验证码存储**: 使用内存 Map 存储（`verificationCodes`），包含 code、过期时间、创建时间
2. **重发限制**: 60 秒内不允许重复发送验证码
3. **Token 有效期**: 7 天，存储在 localStorage
4. **邮箱白名单**: 仅白名单邮箱可使用终端功能

### 3.2 WebSocket 终端架构

这是项目的核心，实现了浏览器与本地 PTY 的实时通信：

```
┌──────────────────────────────────────────────────────────────┐
│                        WebSocket 连接层                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      认证流程      ┌──────────────┐      │
│  │   连接建立   │ ─────────────────> │   发送 Token  │      │
│  └──────────────┘                   └──────────────┘      │
│         ▲                                  │               │
│         │        未认证拒绝操作              │               │
│         │<───────────────────────────────── │               │
│                    │                                     │
│  ┌──────────────┐                   ┌──────────────┐      │
│  │  认证成功    │ <──────────────── │  验证 Token  │      │
│  └──────────────┘                   └──────────────┘      │
│         │                                                   │
│         │ 检查是否有持久化会话                               │
│         ▼                                                   │
│  ┌─────────────────┐      ┌─────────────────┐             │
│  │  复用现有会话    │ 或   │  创建新 PTY     │             │
│  │  (重连恢复)     │      │  首次连接/新建   │             │
│  └─────────────────┘      └─────────────────┘             │
│         │                         │                         │
│         ▼                         ▼                         │
│  ┌─────────────────────────────────────────────────┐       │
│  │           PTY ↔ WebSocket 双向通信              │       │
│  └─────────────────────────────────────────────────┘       │
│         │                         │                         │
│    用户输入───────────────────────> PTY 输出                 │
│    (数据流)                   <────────── (数据流)           │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**关键设计点：**

1. **会话持久化**:
   - 使用 `persistentSessions` Map 存储用户会话
   - key = `email:clientId`，支持多设备/多标签页独立会话
   - PTY 进程在 WebSocket 断开时保持运行

2. **客户端 ID 生成**:
   ```javascript
   const generateClientId = () => {
     const stored = sessionStorage.getItem('terminal_client_id');
     if (stored) return stored;
     const id = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
     sessionStorage.setItem('terminal_client_id', id);
     return id;
   };
   ```
   - 存储在 `sessionStorage`，标签页关闭后失效
   - 同一用户在不同设备有独立会话

3. **消息类型**:
   ```javascript
   {
     type: 'auth',        // 认证
     type: 'input',       // 用户输入
     type: 'output',      // PTY 输出
     type: 'resize',      // 调整终端尺寸
     type: 'kill',        // 发送 Ctrl+C
     type: 'claude_ready' // Claude 准备好
   }
   ```

### 3.3 PTY 管理架构

```
┌──────────────────────────────────────────────────────────┐
│                    PTY 会话管理                           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │  persistentSessions: Map<sessionKey, Session>     │ │
│  │                                                    │ │
│  │  Session 结构:                                     │ │
│  │  {                                                │ │
│  │    ptyProcess: PTY,                               │ │
│  │    cwd: string,                                   │ │
│  │    outputHistory: string,                          │ │
│  │    claudeReady: boolean,                          │ │
│  │    readyIndex: number                             │ │
│  │  }                                                │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                             │
│                          │ 绑定输出流                  │
│                          ▼                             │
│  ┌────────────────────────────────────────────────────┐ │
│  │  clientState: Map<WebSocket, ClientState>         │ │
│  │                                                    │ │
│  │  ClientState 结构:                                │ │
│  │  {                                                │ │
│  │    ptyProcess: PTY, // 指向持久化会话的 PTY       │ │
│  │    authenticated: boolean,                         │ │
│  │    email: string,                                 │ │
│  │    clientId: string,                              │ │
│  │    sessionKey: string                            │ │
│  │  }                                                │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                             │
│                          │ onData 事件                 │
│                          ▼                             │
│  ┌────────────────────────────────────────────────────┐ │
│  │  WebSocket.send(JSON.stringify({                   │ │
│  │    type: 'output',                                │ │
│  │    data: PTY输出                                   │ │
│  │  }))                                             │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**设计优势：**
1. **会话恢复**: 重连后自动恢复之前的 PTY 会话
2. **多设备支持**: 不同设备使用不同 clientId
3. **输出历史**: 保留最近 50KB 输出记录
4. **Claude 检测**: 自动检测 Claude Code CLI 是否就绪

## 四、数据流设计

### 4.1 终端输入流

```
用户键盘输入
    ↓
xterm.js onData 事件
    ↓
TerminalContext.sendMessage({ type: 'input', data })
    ↓
WebSocket.send(JSON.stringify(message))
    ↓
服务端 ws.on('message')
    ↓
handleMessage() → handleInput()
    ↓
安全检查（黑名单过滤）
    ↓
ptyProcess.write(input)
    ↓
PowerShell 执行命令
```

### 4.2 终端输出流

```
PowerShell 输出
    ↓
node-pty.onData 事件
    ↓
更新 session.outputHistory
    ↓
检测 Claude 是否就绪 (识别 '>' 或 '❯' 提示符)
    ↓
WebSocket.send(JSON.stringify({ type: 'output', data }))
    ↓
前端 ws.on('message')
    ↓
TerminalContext 广播消息
    ↓
Terminal 组件接收 → xterm.write(data)
    ↓
终端显示输出
```

### 4.3 认证流程

```
前端 → POST /api/auth/send-code { email }
    ↓
检查邮箱白名单
    ↓
生成 6 位随机验证码
    ↓
存储到 verificationCodes (5 分钟有效)
    ↓
发送邮件 (Nodemailer) 或控制台输出 (开发模式)
    ↓
返回 { success: true, expiresIn: 300 }

前端 → POST /api/auth/verify { email, code }
    ↓
验证验证码 (匹配 + 未过期)
    ↓
生成 JWT Token (7 天有效)
    ↓
返回 { success: true, token, email }

前端 → 存储 token 到 localStorage
    ↓
WebSocket 连接 → type: 'auth', token
    ↓
服务端验证 Token
    ↓
初始化/恢复 PTY 会话
```

## 五、安全设计

### 5.1 认证安全

1. **Token 验证**: WebSocket 每次连接必须提供有效 Token
2. **邮箱白名单**: 仅配置的邮箱可使用终端
3. **验证码限制**: 60 秒重发间隔，5 分钟过期
4. **Token 过期**: 7 天后自动失效

### 5.2 命令安全

```javascript
const dangerousCommands = [
  'format c:',
  'del /s /q c:',
  'rm -rf /',
  'rmdir /s /q c:',
  'shutdown',
  'restart-computer',
  'stop-computer'
];
```

- 在回车提交前检查完整命令
- 匹配黑名单直接拒绝执行
- 防止误操作导致的系统破坏

### 5.3 网络安全

- CORS 配置允许跨域访问
- WebSocket 需认证后才能使用
- HTTPS/WSS 支持 (生产环境)

## 六、前端状态管理

### 6.1 AuthContext

```
┌────────────────────────────────────┐
│         AuthContext              │
├────────────────────────────────────┤
│ State:                           │
│  - user: { email } | null       │
│  - token: string | null          │
│  - loading: boolean              │
│  - isAuthenticated: boolean      │
├────────────────────────────────────┤
│ Actions:                         │
│  - sendCode(email)               │
│  - verify(email, code)           │
│  - logout()                      │
└────────────────────────────────────┘
```

### 6.2 TerminalContext

```
┌────────────────────────────────────┐
│      TerminalContext              │
├────────────────────────────────────┤
│ State:                           │
│  - isConnected: boolean          │
│  - authStatus: string            │
│  - user: { email } | null       │
├────────────────────────────────────┤
│ Refs:                            │
│  - wsRef: WebSocket | null       │
│  - messageHandlersRef: Set       │
│  - clientIdRef: string          │
├────────────────────────────────────┤
│ Actions:                         │
│  - sendMessage(message)           │
│  - addMessageHandler(handler)     │
│  - connectWebSocket()             │
└────────────────────────────────────┘
```

## 七、数据库设计

### 7.1 表结构

**articles 表**:
```sql
CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  category TEXT DEFAULT 'frontend',
  tags TEXT DEFAULT '[]',
  author TEXT DEFAULT '陈煌',
  visibility TEXT DEFAULT 'public',
  status TEXT DEFAULT 'published',
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  color TEXT DEFAULT '#00F5D4',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**comments 表**:
```sql
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  author TEXT NOT NULL,
  avatar TEXT DEFAULT '游',
  avatar_color TEXT DEFAULT '#A78BFA',
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);
```

**drafts 表**:
```sql
CREATE TABLE drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT DEFAULT 'frontend',
  tags TEXT DEFAULT '[]',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 7.2 设计考虑

1. **外键约束**: `ON DELETE CASCADE` 确保文章删除时评论自动清理
2. **JSON 字段**: `tags` 使用 JSON 字符串存储，灵活可扩展
3. **时间戳**: 使用 SQLite 的 `CURRENT_TIMESTAMP`
4. **外键启用**: `PRAGMA foreign_keys = ON`

## 八、性能优化

### 8.1 前端优化

1. **ResizeObserver**: 使用现代 API 监听容器尺寸变化
2. **防抖处理**: 尺寸变化 50ms 防抖后发送 resize
3. **消息处理器模式**: 使用 Set 存储多个订阅者，减少重复监听
4. **延迟初始化**: 终端延迟 100ms 连接，避免阻塞首屏

### 8.2 后端优化

1. **同步数据库**: `better-sqlite3` 比 async 版本性能更好
2. **连接复用**: PTY 会话持久化，避免重复创建
3. **输出历史限制**: 最大 50KB，防止内存溢出
4. **指数退避重连**: 3s → 6s → 12s → 24s → 30s (max)

## 九、部署架构

```
┌─────────────────────────────────────────────────────┐
│                  生产环境                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────┐      ┌────────────┐                │
│  │ Nginx 反向代理 │ ←──> │ Node.js  │                │
│  │ (SSL 终止)   │      │ :3001     │                │
│  └────────────┘      └────────────┘                │
│         ▲                    │                      │
│         │                    │                      │
│    HTTPS/WSS              HTTP/WS                 │
│         │                    │                      │
│    用户浏览器 ─────────────────┘                      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## 十、扩展性设计

### 10.1 多用户支持

当前已支持多用户，通过邮箱区分。未来可扩展：
- 用户权限管理
- 资源隔离（每个用户独立目录）
- 使用量限制

### 10.2 多 PTY 会话

当前每个用户一个会话，可扩展：
- 多标签页独立会话
- 会话管理界面
- 会话持久化到文件

### 10.3 集群扩展

使用 Redis 替代内存存储：
- 验证码持久化
- WebSocket 状态同步
- PTY 会话共享

## 总结

MyBlog 项目的架构设计体现了以下工程实践：

1. **前后端分离**: 职责清晰，易于扩展
2. **实时通信**: WebSocket 提供流畅的终端体验
3. **会话持久化**: 断线重连不丢失上下文
4. **安全防护**: 多层验证防止未授权访问
5. **性能优化**: 防抖、复用、限制等手段

通过这套架构，我们成功将完整的命令行终端体验带到了浏览器中，为开发者提供了随时随地的开发环境访问能力。
