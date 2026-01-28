# MyBlog - 个人博客系统

一个基于 React + Node.js 的现代化个人博客系统，具有赛博朋克风格的 UI 设计，支持在线 Web 终端（PTY）功能。

## ✨ 功能特性

- 🎨 **赛博朋克风格 UI** - 霓虹灯效果、渐变色彩、现代化设计
- 📝 **博客系统** - 文章列表、文章详情、Markdown 编辑器
- 💻 **Web 终端** - 基于 xterm.js + node-pty 的完整 PTY 终端
  - 实时命令输出（WebSocket 流式传输）
  - 支持交互式程序（如 `claude`、`vim`、`node` REPL）
  - Ctrl+C 中断、Tab 补全、历史命令
  - 全屏模式（带平滑动画）
  - 局域网访问支持（手机可用）
  - 指数退避自动重连
- 📱 **响应式设计** - 支持桌面和移动设备

## 🛠️ 技术栈

### 前端
- **React 19** - UI 框架
- **Vite** - 构建工具
- **React Router** - 路由管理
- **xterm.js** - 终端渲染
- **Lucide React** - 图标库

### 后端
- **Node.js** - 运行环境
- **Express** - Web 框架
- **WebSocket (ws)** - 实时通信
- **node-pty** - 伪终端支持

## 📁 项目结构

```
myblog/
├── web/                    # 前端项目
│   ├── src/
│   │   ├── components/     # 公共组件
│   │   │   ├── Terminal/   # Web 终端组件
│   │   │   ├── CodeWindow/ # 代码窗口组件
│   │   │   └── ...
│   │   ├── pages/          # 页面组件
│   │   │   ├── Home/       # 首页
│   │   │   ├── BlogList/   # 博客列表
│   │   │   ├── BlogDetail/ # 博客详情
│   │   │   └── WriteArticle/ # 写文章
│   │   ├── mock/           # 模拟数据
│   │   ├── App.jsx         # 根组件
│   │   └── main.jsx        # 入口文件
│   └── package.json
│
├── server/                 # 后端项目
│   ├── index.js            # 服务器入口（WebSocket + PTY）
│   └── package.json
│
└── myblog.pen              # Pencil 设计文件
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Windows 10/11（PTY 功能需要）

### 安装依赖

```bash
# 安装前端依赖
cd web
npm install

# 安装后端依赖
cd ../server
npm install
```

### 启动项目

#### 1. 启动后端服务器

```bash
cd server
npm run dev
# 或
node index.js
```

服务器将在以下地址启动：
- HTTP: `http://localhost:3001`
- WebSocket: `ws://localhost:3001`

#### 2. 启动前端开发服务器

```bash
cd web
npm run dev
```

前端将在 `http://localhost:5173` 启动。

#### 3. 局域网访问（手机等设备）

```bash
# 前端启动时添加 --host 参数
cd web
npm run dev -- --host
```

然后使用局域网 IP 访问，例如：`http://192.168.31.159:5173`

### 构建生产版本

```bash
cd web
npm run build
```

构建产物将输出到 `web/dist` 目录。

## 📖 使用说明

### Web 终端

终端位于首页右侧，支持以下功能：

| 功能 | 操作 |
|------|------|
| 执行命令 | 输入命令后按 Enter |
| 中断命令 | Ctrl + C |
| 清屏 | 输入 `clear` 或 `cls` |
| 历史命令 | 上/下箭头键 |
| Tab 补全 | Tab 键 |
| 全屏模式 | 点击右上角按钮 |
| 退出全屏 | 按 Esc 或点击按钮 |

#### 特殊命令

```bash
# 禁用 60 秒超时限制（用于长时间运行的命令）
notimeout: ping -t google.com

# 支持交互式程序
claude
node
python
```

### 安全限制

以下危险命令被禁止执行：
- `format c:`
- `del /s /q c:`
- `rm -rf /`
- `shutdown`
- `restart-computer`

## 🎨 设计文件

项目 UI 设计使用 Pencil MCP 工具创建，设计文件位于 `myblog.pen`。

包含 4 个页面设计：
1. 首页 - 个人展示 + Web 终端
2. 博客列表
3. 博客详情
4. 写文章（后台）

## 📜 许可证

MIT License
