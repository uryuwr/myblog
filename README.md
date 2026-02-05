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

### 方式一：Docker 部署（推荐）

只需安装 Docker，一键启动前后端 + 内网穿透。

#### 1. 安装 Docker

- **macOS / Windows**：下载 [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**：`curl -fsSL https://get.docker.com | sh`

#### 2. 配置环境变量

```bash
# 复制配置模板
cp .env.docker.example .env.docker

# 编辑配置（填入你的 SMTP、JWT 等信息）
nano .env.docker
```

配置项说明：

| 变量 | 说明 | 示例 |
|------|------|------|
| `SMTP_HOST` | 邮件服务器 | `smtp.qq.com` |
| `SMTP_PORT` | SMTP 端口 | `465` |
| `SMTP_USER` | 发件邮箱 | `your@qq.com` |
| `SMTP_PASS` | SMTP 授权码 | QQ邮箱设置中获取 |
| `JWT_SECRET` | 登录令牌密钥 | 随机字符串 |
| `ALLOWED_EMAILS` | 白名单邮箱 | 逗号分隔，留空允许所有 |

> 💡 如果不配置邮件，验证码会在终端日志中显示（开发模式）

#### 3. 启动服务

**macOS / Linux：**
```bash
./start-public.sh
```

**或使用 Docker Compose：**
```bash
# 启动（带内网穿透）
docker compose up myblog

# 后台运行
docker compose up -d myblog

# 查看日志
docker compose logs -f myblog

# 停止
docker compose down
```

启动成功后会显示公网访问地址：
```
============================================
  部署完成！
============================================

  后端地址: https://xxx.trycloudflare.com
  前端地址: http://localhost:5174
  公网访问: https://xxx.trycloudflare.com
```

#### 4. 仅本地模式（不启用隧道）

```bash
docker compose --profile local up myblog-local
```

---

### 方式二：手动部署

#### 1. 安装依赖

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../web
npm install
```

#### 2. 配置环境变量（可选）

```bash
cp server/.env.example server/.env
# 编辑 server/.env 填入配置
```

#### 3. 启动服务（优先使用start-public.bat脚本完成自动化部署，如果失败则通过下列方式手动部署）

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
├── Dockerfile        # Docker 镜像定义
├── docker-compose.yml # Docker Compose 配置
├── .env.docker.example # 环境变量模板
├── start-public.sh   # Mac/Linux 一键启动脚本
├── start-public.bat  # Windows 一键启动脚本
└── README.md
```
