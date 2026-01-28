// Mock 数据 - 后续可替换为 API 调用

// 个人信息
export const userProfile = {
  name: '陈煌',
  title: '后端开发工程师',
  avatar: '陈',
  bio: '热爱编程，专注于 服务端开发，喜欢探索新技术。在这里分享我的技术心得与成长经历，希望能帮助到同样热爱技术的你。',
  skills: ['Java', 'Spring Boot', 'vibe coding', 'kafka'],
  social: {
    github: 'https://github.com/uryuwr',
    email: '289561901@qq.com'
  },
  aboutCode: `const about_me = {
  name: "陈煌",
  role: "全栈开发工程师",
  skills: [
  'Java', 'Spring Boot', 'vibe coding', 'kafka'
  ],
  passion: "构建优秀的用户体验",
};`
};

// 博客分类
export const categories = [
  { id: 'all', name: '全部', color: '#00F5D4' },
  { id: 'frontend', name: '前端', color: '#00F5D4' },
  { id: 'backend', name: '后端', color: '#A78BFA' },
  { id: 'tools', name: '工具', color: '#F59E0B' },
  { id: 'thoughts', name: '随想', color: '#FF6B6B' }
];

// 博客文章列表
export const articles = [
  {
    id: 1,
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

startTransition 是 React 18 中引入的新 API，它允许我们将某些更新标记为「非紧急」。这意味着 React 可以在处理这些更新时被中断，从而保持 UI 的响应性。这对于搜索、筛选等需要处理大量数据的场景特别有用。

## useDeferredValue 的妙用

除了 startTransition，React 18 还引入了 \`useDeferredValue\` Hook，它可以让某个值「延迟」更新：

\`\`\`typescript
const deferredQuery = useDeferredValue(query);
\`\`\`

## 总结

React 18 的并发特性为我们提供了更细粒度的渲染控制能力。合理使用这些 API，可以显著提升应用的响应性和用户体验。`,
    category: 'frontend',
    tags: ['React', '性能优化', '前端'],
    author: '陈煌',
    createdAt: '2024-01-15',
    views: 1234,
    likes: 86,
    comments: 12,
    color: '#00F5D4'
  },
  {
    id: 2,
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
    tags: ['Node.js', '架构', '高并发'],
    author: '张磊',
    createdAt: '2024-01-10',
    views: 892,
    likes: 45,
    comments: 8,
    color: '#A78BFA'
  },
  {
    id: 3,
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
    tags: ['CSS', '动画', '前端'],
    author: '张磊',
    createdAt: '2024-01-05',
    views: 567,
    likes: 32,
    comments: 5,
    color: '#F59E0B'
  },
  {
    id: 4,
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
    tags: ['TypeScript', '类型系统'],
    author: '张磊',
    createdAt: '2024-01-02',
    views: 445,
    likes: 28,
    comments: 6,
    color: '#4ECDC4'
  },
  {
    id: 5,
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
    tags: ['Git', '工具', '团队协作'],
    author: '张磊',
    createdAt: '2023-12-28',
    views: 678,
    likes: 41,
    comments: 9,
    color: '#FF6B6B'
  }
];

// 评论数据
export const comments = [
  {
    id: 1,
    articleId: 1,
    author: '李明',
    avatar: '李',
    avatarColor: '#FF6B6B',
    content: '非常详细的讲解！startTransition 确实解决了我项目中的卡顿问题，感谢分享！',
    createdAt: '2 天前'
  },
  {
    id: 2,
    articleId: 1,
    author: '王小芳',
    avatar: '王',
    avatarColor: '#4ECDC4',
    content: '请问 useDeferredValue 和 startTransition 有什么区别呢？期待更多相关文章~',
    createdAt: '5 天前'
  },
  {
    id: 3,
    articleId: 1,
    author: '陈工',
    avatar: '陈',
    avatarColor: '#A78BFA',
    content: '文章写得很清晰，代码示例也很实用，收藏了！',
    createdAt: '1 周前'
  }
];

// 草稿数据
export const drafts = [
  { id: 1, title: 'Node.js 性能调优', updatedAt: '昨天' },
  { id: 2, title: 'TypeScript 高级类型', updatedAt: '3天前' },
  { id: 3, title: 'CSS Grid 布局实战', updatedAt: '上周' }
];

// API 模拟函数 (后续替换为真实 API)
export const api = {
  // 获取文章列表
  getArticles: (category = 'all', keyword = '') => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let result = articles;
        if (category !== 'all') {
          result = result.filter(a => a.category === category);
        }
        if (keyword) {
          result = result.filter(a => 
            a.title.toLowerCase().includes(keyword.toLowerCase()) ||
            a.description.toLowerCase().includes(keyword.toLowerCase())
          );
        }
        resolve(result);
      }, 300);
    });
  },

  // 获取单篇文章
  getArticle: (id) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(articles.find(a => a.id === parseInt(id)));
      }, 200);
    });
  },

  // 获取精选文章
  getFeaturedArticles: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(articles.slice(0, 3));
      }, 200);
    });
  },

  // 获取评论
  getComments: (articleId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(comments.filter(c => c.articleId === parseInt(articleId)));
      }, 200);
    });
  },

  // 添加评论
  addComment: (articleId, content) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newComment = {
          id: comments.length + 1,
          articleId: parseInt(articleId),
          author: '游客',
          avatar: '游',
          avatarColor: '#A78BFA',
          content,
          createdAt: '刚刚'
        };
        comments.unshift(newComment);
        resolve(newComment);
      }, 300);
    });
  },

  // 获取草稿
  getDrafts: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(drafts);
      }, 200);
    });
  },

  // 保存文章
  saveArticle: (article) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Saving article:', article);
        resolve({ success: true, id: Date.now() });
      }, 500);
    });
  }
};
