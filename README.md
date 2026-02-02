# 我的博客 (MyBlog)

一个全栈博客应用，集成 Web 终端功能，支持公网访问。

## 技术栈

### 前端 (web/)
- React 19 + React Router 7
- Vite 7.x 构建工具
- @xterm/xterm 6.x 终端模拟
- PWA 支持 (Service Worker)

### 后端 (server/)
- Express.js + WebSocket
- better-sqlite3 (SQLite 数据库)
- node-pty (PowerShell 终端)
- JWT 认证

## 快速开始

### 1. 安装依赖

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../web
npm install
```

### 2. 启动服务（优先使用start-public.bat脚本完成自动化部署，如果失败则通过下列方式手动部署）

**终端 1 - 启动后端 (端口 3001)**
```bash
cd server
npm run dev
```

**终端 2 - 启动前端 (端口 5174)**
```bash
cd web
npm run dev
```

启动后访问：http://localhost:5174

## Cloudflare Tunnel 公网访问

### 安装 cloudflared

**Windows (使用 winget)**
```powershell
winget install --id Cloudflare.cloudflared -e
```

**Windows (Chocolatey)**
```powershell
choco install cloudflared
```

**macOS (Homebrew)**
```bash
brew install cloudflared
```

**Linux**
```bash
# Debian/Ubuntu
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/
```

### 启动公网隧道

启动你的博客服务后（新开一个终端）：

```bash
# 启动隧道，将本地 5174 端口映射到公网
cloudflared tunnel --url http://localhost:5174
```

启动后会显示类似以下的公网地址：
```
2024-01-01T10:00:00Z INF +-------------------------------------------------------------+
2024-01-01T10:00:00Z INF |  Your quick Tunnel has been created! Visit it at (it will\n
2024-01-01T10:00:00Z INF |  expire in 3 months):                                        \n
2024-01-01T10:00:00Z INF |                                                                \n
2024-01-01T10:00:00Z INF |  https://random-name.trycloudflare.com                      \n
2024-01-01T10:00:00Z INF |                                                                \n
2024-01-01T10:00:00Z INF +-------------------------------------------------------------+
```

访问生成的 HTTPS 地址即可公网访问博客。

## 功能特性

- **博客系统**：文章 CRUD、分类标签、点赞评论
- **Web 终端**：集成 Claude AI 的交互式终端
- **会话持久化**：终端会话支持断线重连
- **PWA 支持**：可安装为本地应用
- **移动端适配**：虚拟键盘、触摸屏优化

## 认证

默认仅允许邮箱 `289561901@qq.com` 登录（如需修改，配置环境变量 `ALLOWED_EMAILS`）

## 目录结构

```
myblog/
├── server/           # 后端服务
│   ├── index.js      # 主入口 (Express + WebSocket)
│   └── db/           # 数据库层
├── web/              # 前端应用
│   ├── src/
│   │   ├── contexts/ # React Context
│   │   ├── pages/    # 页面组件
│   │   └── components/ # 公共组件
│   └── public/       # 静态资源 (PWA图标等)
└── README.md
```
