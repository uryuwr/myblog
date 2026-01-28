import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库文件存储在 server/db/blog.db
const dbPath = path.join(__dirname, 'blog.db');
const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 初始化数据库表
function initDatabase() {
  // 文章表
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
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
    )
  `);

  // 评论表
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      author TEXT NOT NULL,
      avatar TEXT DEFAULT '游',
      avatar_color TEXT DEFAULT '#A78BFA',
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    )
  `);

  // 草稿表
  db.exec(`
    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      category TEXT DEFAULT 'frontend',
      tags TEXT DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ 数据库初始化完成');
}

// 插入示例数据（仅当表为空时）
function seedDatabase() {
  const count = db.prepare('SELECT COUNT(*) as count FROM articles').get();
  
  if (count.count === 0) {
    console.log('📝 插入示例数据...');
    
    const insertArticle = db.prepare(`
      INSERT INTO articles (title, description, content, category, tags, author, views, likes, color, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertComment = db.prepare(`
      INSERT INTO comments (article_id, author, avatar, avatar_color, content, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
    `);

    // 示例文章数据
    const articles = [
      {
        title: 'React 18 性能优化最佳实践',
        description: '深入探讨 React 18 中的并发特性、Suspense 和自动批处理等新功能，以及如何利用它们优化应用性能...',
        content: `## 前言

React 18 带来了许多令人兴奋的新特性，其中最引人注目的是并发渲染（Concurrent Rendering）。这个特性让 React 能够同时准备多个版本的 UI，从而提供更流畅的用户体验。

## 什么是 startTransition

\`startTransition\` 是 React 18 中引入的新 API，它允许我们将某些更新标记为「非紧急」。这意味着 React 可以在处理这些更新时被中断，从而保持 UI 的响应性。

\`\`\`typescript
import { startTransition } from 'react';

function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  function handleChange(e) {
    // 紧急更新：显示输入内容
    setQuery(e.target.value);
    
    // 非紧急更新：搜索结果
    startTransition(() => {
      setResults(searchData(e.target.value));
    });
  }
}
\`\`\`

## 核心优化策略

startTransition 是 React 18 中引入的新 API，它允许我们将某些更新标记为「非紧急」。这意味着 React 可以在处理这些更新时被中断，从而保持 UI 的响应性。

## useDeferredValue 的妙用

除了 startTransition，React 18 还引入了 \`useDeferredValue\` Hook，它可以让某个值「延迟」更新：

\`\`\`typescript
const deferredQuery = useDeferredValue(query);
\`\`\`

## 总结

React 18 的并发特性为我们提供了更细粒度的渲染控制能力。合理使用这些 API，可以显著提升应用的响应性和用户体验。`,
        category: 'frontend',
        tags: JSON.stringify(['React', '性能优化', '前端']),
        author: '陈煌',
        views: 1234,
        likes: 86,
        color: '#00F5D4',
        created_at: '2024-01-15'
      },
      {
        title: 'Node.js 高并发架构设计',
        description: '探讨 Node.js 在高并发场景下的架构设计，包括集群模式、负载均衡和性能监控等最佳实践...',
        content: `## 前言

Node.js 凭借其非阻塞 I/O 和事件驱动的特性，非常适合处理高并发场景。本文将深入探讨如何设计一个高性能的 Node.js 架构。

## 集群模式

Node.js 是单线程的，但我们可以利用 cluster 模块来充分利用多核 CPU：

\`\`\`javascript
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  require('./server');
}
\`\`\`

## 性能优化建议

1. 使用连接池管理数据库连接
2. 实现请求缓存机制
3. 采用流式处理大文件
4. 使用 PM2 进行进程管理`,
        category: 'backend',
        tags: JSON.stringify(['Node.js', '架构', '高并发']),
        author: '陈煌',
        views: 892,
        likes: 45,
        color: '#A78BFA',
        created_at: '2024-01-10'
      },
      {
        title: 'CSS 动画高级技巧',
        description: '从入门到精通 CSS 动画，包括 keyframes、transition、以及性能优化等高级技巧...',
        content: `## 前言

CSS 动画是创建流畅用户界面的关键。本文将介绍一些高级技巧，帮助你创建更加出色的动画效果。

## Keyframes 动画

\`\`\`css
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

.animated-element {
  animation: pulse 2s ease-in-out infinite;
}
\`\`\`

## 性能优化

使用 transform 和 opacity 属性来触发 GPU 加速，避免触发重排和重绘。`,
        category: 'frontend',
        tags: JSON.stringify(['CSS', '动画', '前端']),
        author: '陈煌',
        views: 567,
        likes: 32,
        color: '#F59E0B',
        created_at: '2024-01-05'
      },
      {
        title: 'TypeScript 高级类型体操',
        description: '深入理解 TypeScript 的高级类型系统，包括条件类型、映射类型、模板字面量类型等...',
        content: `## 前言

TypeScript 的类型系统非常强大，掌握高级类型可以让我们写出更加类型安全的代码。

## 条件类型

\`\`\`typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;  // true
type B = IsString<number>;  // false
\`\`\`

## 映射类型

\`\`\`typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};
\`\`\``,
        category: 'frontend',
        tags: JSON.stringify(['TypeScript', '类型系统']),
        author: '陈煌',
        views: 445,
        likes: 28,
        color: '#4ECDC4',
        created_at: '2024-01-02'
      },
      {
        title: 'Git 工作流最佳实践',
        description: '介绍团队协作中常用的 Git 工作流，包括 Git Flow、GitHub Flow 以及提交规范...',
        content: `## Git Flow 工作流

Git Flow 是一种经典的分支管理策略，适合有计划发布周期的项目。

### 分支说明

- \`main\`: 生产环境代码
- \`develop\`: 开发分支
- \`feature/*\`: 功能分支
- \`release/*\`: 发布分支
- \`hotfix/*\`: 紧急修复分支`,
        category: 'tools',
        tags: JSON.stringify(['Git', '工具', '团队协作']),
        author: '陈煌',
        views: 678,
        likes: 41,
        color: '#FF6B6B',
        created_at: '2023-12-28'
      }
    ];

    // 插入文章
    const insertMany = db.transaction((articles) => {
      for (const article of articles) {
        insertArticle.run(
          article.title,
          article.description,
          article.content,
          article.category,
          article.tags,
          article.author,
          article.views,
          article.likes,
          article.color,
          article.created_at
        );
      }
    });
    
    insertMany(articles);

    // 插入评论（针对第一篇文章）
    insertComment.run(1, '李明', '李', '#FF6B6B', '非常详细的讲解！startTransition 确实解决了我项目中的卡顿问题，感谢分享！', 2);
    insertComment.run(1, '王小芳', '王', '#4ECDC4', '请问 useDeferredValue 和 startTransition 有什么区别呢？期待更多相关文章~', 5);
    insertComment.run(1, '陈工', '陈', '#A78BFA', '文章写得很清晰，代码示例也很实用，收藏了！', 7);

    console.log('✅ 示例数据插入完成');
  }
}

// 初始化
initDatabase();
seedDatabase();

export default db;
