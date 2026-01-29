# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack blog application with an integrated web terminal feature:

- **server/** - Node.js backend (Express.js + WebSocket)
  - `index.js` - Main server entry point with WebSocket terminal and authentication
  - `db/` - Database layer using better-sqlite3
    - `database.js` - SQLite database initialization with seeding
    - `articleRoutes.js` - REST API routes for articles and comments
    - `blog.db` - SQLite database file (auto-created on first run)
- **web/** - React frontend (Vite + React 19)
  - `src/contexts/` - React Context providers for auth and terminal
  - `src/pages/` - Page components (Home, BlogList, BlogDetail, WriteArticle, Piweisi)
  - `src/components/` - Reusable components (ArticleCard, Terminal, LoginModal, ConfirmDialog, etc.)

## Commands

### Backend (server/)
```bash
npm install          # Install dependencies
npm start            # Start production server (port 3001)
npm run dev          # Start with --watch for auto-restart (development mode)
```

### Frontend (web/)
```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (port 5174)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

Both servers bind to `0.0.0.0` for LAN access.

## Architecture

### Backend Architecture

**Main Server (index.js)**
- Express HTTP server on port 3001
- WebSocket server integrated for terminal access
- JWT-based email authentication system
- Email verification with SMTP (Nodemailer)
- `node-pty` integration for PowerShell terminal sessions
- Command blacklist for security (prevents dangerous commands)

**Authentication Flow**
1. Client sends email to `/api/auth/send-code` → sends 6-digit verification code
2. Client submits code to `/api/auth/verify` → returns JWT token (7 day expiry)
3. WebSocket requires `auth` message with token before PTY initialization
4. Email whitelist: only `289561901@qq.com` by default (configurable via `ALLOWED_EMAILS` env var)

**WebSocket Terminal**
- Each connection spawns a PTY process via `node-pty` (PowerShell on Windows, shell on Linux/Mac)
- Bidirectional communication: client input → PTY → terminal output → client
- Auto-reconnection with exponential backoff (3s to 30s max)
- Connection state managed per-client in `clientState` Map
- PTY cleanup on disconnect (sends `exit` command, avoids force kill)
- Session persistence: terminal sessions are restored on reconnection using `persistentSessions` Map
- Claude AI integration: automatically starts Claude AI assistant when terminal connects

**Database (SQLite via better-sqlite3)**
- Located at `server/db/blog.db`
- Tables: `articles`, `comments`, `drafts`
- Foreign key constraints enabled (comments.article_id references articles.id)
- Auto-seeded with sample data on first run

**API Routes (/api)**
- `/articles` - CRUD operations for articles
  - `GET /api/articles` - Get articles list
  - `GET /api/articles/:id` - Get single article
  - `POST /api/articles` - Create article
  - `PUT /api/articles/:id` - Update article
  - `DELETE /api/articles/:id` - Delete article
  - `POST /api/articles/:id/like` - Like article
- `/articles/:id/comments` - Comment management
  - `GET /api/articles/:id/comments` - Get comments
  - `POST /api/articles/:id/comments` - Add comment
  - `DELETE /api/comments/:commentId` - Delete comment
- `/drafts` - Draft management
  - `GET /api/drafts` - Get drafts list
  - `POST /api/drafts` - Save draft
- `/categories` - Category list with colors
- `/auth/*` - Authentication endpoints
  - `POST /api/auth/send-code` - Send verification code
  - `POST /api/auth/verify` - Verify code and get JWT token
  - `GET /api/auth/verify-token` - Verify JWT token
- `/health` - Health check endpoint

### Frontend Architecture

**Context Layer**
- `AuthContext` - Manages JWT token, user state, and authentication flow
- `TerminalContext` - WebSocket connection management, message routing, reconnection logic

**Routing (React Router v7)**
- `/` - Home page with featured articles
- `/blog` - Blog list with filters
- `/blog/:id` - Article detail with comments
- `/write` - Article editor
- `/piweisi` - Special page (currently under development)

**Terminal Integration**
- Uses `xterm.js` library for terminal emulation
- Addons: `xterm-addon-fit` (resize), `xterm-addon-web-links` (clickable links)
- Dynamic WebSocket URL based on protocol and hostname
- Terminal state synchronized with `TerminalContext`
- Features: full-screen mode, virtual keyboard, mobile-friendly

## Key Configuration

### Environment Variables (server/.env)
- `JWT_SECRET` - JWT signing secret (default: change in production)
- `ALLOWED_EMAILS` - Email whitelist for authentication (comma-separated, empty = allow all)
- `SMTP_HOST` - SMTP server host (default: smtp.qq.com)
- `SMTP_PORT` - SMTP port (default: 465)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password (use authorization code for QQ email)
- `EMAIL_FROM` - Sender email address (default: "MyBlog Terminal" <your-email@qq.com>)

### Vite Configuration (web/vite.config.js)
- Server listens on all interfaces (0.0.0.0)
- Dev server port: 5174

### Server Configuration
- HTTP server port: 3001
- WebSocket server: same port (integrated)
- Bind address: 0.0.0.0 (for LAN access)
- PTY: PowerShell on Windows, shell on Unix-like systems

### Database Schema

**articles table:**
- `id` - INTEGER PRIMARY KEY AUTOINCREMENT
- `title` - TEXT NOT NULL
- `description` - TEXT
- `content` - TEXT
- `category` - TEXT DEFAULT 'frontend'
- `tags` - TEXT DEFAULT '[]' (JSON string)
- `author` - TEXT DEFAULT '陈煌'
- `visibility` - TEXT DEFAULT 'public'
- `status` - TEXT DEFAULT 'published'
- `views` - INTEGER DEFAULT 0
- `likes` - INTEGER DEFAULT 0
- `color` - TEXT DEFAULT '#00F5D4'
- `created_at` - DATETIME DEFAULT CURRENT_TIMESTAMP
- `updated_at` - DATETIME DEFAULT CURRENT_TIMESTAMP

**comments table:**
- `id` - INTEGER PRIMARY KEY AUTOINCREMENT
- `article_id` - INTEGER NOT NULL (foreign key references articles.id ON DELETE CASCADE)
- `author` - TEXT NOT NULL
- `avatar` - TEXT DEFAULT '游'
- `avatar_color` - TEXT DEFAULT '#A78BFA'
- `content` - TEXT NOT NULL
- `created_at` - DATETIME DEFAULT CURRENT_TIMESTAMP

**drafts table:**
- `id` - INTEGER PRIMARY KEY AUTOINCREMENT
- `title` - TEXT NOT NULL
- `content` - TEXT
- `category` - TEXT DEFAULT 'frontend'
- `tags` - TEXT DEFAULT '[]' (JSON string)
- `updated_at` - DATETIME DEFAULT CURRENT_TIMESTAMP

### Categories (hardcoded in articleRoutes.js)
- `all` - 全部 (#00F5D4)
- `frontend` - 前端 (#00F5D4)
- `backend` - 后端 (#A78BFA)
- `tools` - 工具 (#F59E0B)
- `thoughts` - 随想 (#FF6B6B)

## Development Notes

- Backend uses ES modules (`"type": "module"`)
- Frontend uses React 19 with Vite
- Terminal security: commands are blacklisted before execution
- Verification codes stored in memory (consider Redis for production)
- WebSocket handles automatic reconnection on visibility change
- API URLs are dynamically constructed based on current hostname
- Email service runs in background (non-blocking if SMTP fails)
- Session persistence allows terminal state restoration across page reloads

## Project Features

1. **Integrated Claude AI Terminal**: Real terminal access via WebSocket with automatic Claude AI assistant integration
2. **Session Persistence**: Terminal sessions persist across connections and page reloads (stored by email)
3. **Mobile-Friendly**: Terminal supports touch operations, virtual keyboard, and full-screen mode
4. **Security**: Command blacklist, JWT authentication, email whitelist
5. **Real-time Communication**: WebSocket for bidirectional terminal communication
6. **Responsive Design**: Adapts to different screen sizes automatically
7. **Auto-reconnection**: WebSocket automatically reconnects with exponential backoff

## Key Files Reference

### Backend
- `server/index.js` - Main server with WebSocket and auth
- `server/db/database.js` - Database initialization and seeding
- `server/db/articleRoutes.js` - All API routes
- `server/db/blog.db` - SQLite database (created on first run)

### Frontend
- `web/src/contexts/AuthContext.js` - Authentication state management
- `web/src/contexts/TerminalContext.js` - Terminal WebSocket management
- `web/src/pages/WriteArticle/WriteArticle.jsx` - Article editor
- `web/src/pages/BlogDetail/BlogDetail.jsx` - Article detail page
- `web/src/components/Terminal/Terminal.jsx` - Terminal UI component
- `web/src/components/LoginModal/LoginModal.jsx` - Authentication modal
- `web/src/components/ConfirmDialog/ConfirmDialog.jsx` - Custom confirmation dialog
- `web/src/services/api.js` - API service layer
