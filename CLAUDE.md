# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack blog application with an integrated web terminal feature:

- **server/** - Node.js backend (Express.js + WebSocket)
  - `index.js` - Main server entry point with WebSocket terminal and authentication
  - `db/` - Database layer using better-sqlite3
    - `database.js` - SQLite database initialization with seeding
    - `articleRoutes.js` - REST API routes for articles and comments
- **web/** - React frontend (Vite + React 19)
  - `src/contexts/` - React Context providers for auth and terminal
  - `src/pages/` - Page components (Home, BlogList, BlogDetail, WriteArticle, Piweisi)
  - `src/components/` - Reusable components (ArticleCard, Terminal, LoginModal, etc.)

## Commands

### Backend (server/)
```bash
npm install          # Install dependencies
npm start            # Start production server
npm run dev          # Start with --watch for auto-restart
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
4. Email whitelist: only `289561901@qq.com` by default (configurable via `ALLOWED_EMAILS`)

**WebSocket Terminal**
- Each connection spawns a PTY process via `node-pty` (PowerShell on Windows)
- Bidirectional communication: client input → PTY → terminal output → client
- Auto-reconnection with exponential backoff (3s to 30s max)
- Connection state managed per-client in `clientState` Map
- PTY cleanup on disconnect (sends `exit` command, avoids force kill)

**Database (SQLite via better-sqlite3)**
- Located at `server/db/blog.db`
- Tables: `articles`, `comments`, `drafts`
- Foreign key constraints enabled
- Auto-seeded with sample data on first run

**API Routes (/api)**
- `/articles` - CRUD operations for articles
- `/articles/:id/comments` - Comment management
- `/articles/:id/like` - Like functionality
- `/drafts` - Draft management
- `/categories` - Category list with colors
- `/auth/*` - Authentication endpoints

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

## Key Configuration

### Environment Variables (server)
- `JWT_SECRET` - JWT signing secret (default: change in production)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email SMTP config
- `EMAIL_FROM` - Sender email address

### Database Schema
- Articles: title, description, content, category, tags (JSON), author, visibility, status, views, likes, color
- Comments: article_id (FK), author, avatar, avatar_color, content
- Drafts: title, content, category, tags (JSON)

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
