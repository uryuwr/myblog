import express from 'express';
import db from './database.js';

// 验证用户邮箱是否在白名单中
function isEmailWhitelisted(email) {
  if (!email) return false;

  const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS
    ? process.env.ALLOWED_EMAILS.split(',').map(e => e.trim())
    : [];

  // 如果白名单为空，允许所有邮箱
  if (ALLOWED_EMAILS.length === 0) return true;

  return ALLOWED_EMAILS.includes(email);
}

const router = express.Router();

// ========== 分类数据 ==========
const categories = [
  { id: 'all', name: '全部', color: '#00F5D4' },
  { id: 'frontend', name: '前端', color: '#00F5D4' },
  { id: 'backend', name: '后端', color: '#A78BFA' },
  { id: 'tools', name: '工具', color: '#F59E0B' },
  { id: 'thoughts', name: '随想', color: '#FF6B6B' }
];

// ========== 辅助函数 ==========

// 格式化文章数据
function formatArticle(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    content: row.content,
    category: row.category,
    tags: JSON.parse(row.tags || '[]'),
    author: row.author,
    visibility: row.visibility,
    status: row.status,
    views: row.views,
    likes: row.likes,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// 格式化评论数据
function formatComment(row) {
  // 计算相对时间
  const createdAt = new Date(row.created_at);
  const now = new Date();
  const diffMs = now - createdAt;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  let timeStr;
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      timeStr = '刚刚';
    } else {
      timeStr = `${diffHours} 小时前`;
    }
  } else if (diffDays === 1) {
    timeStr = '昨天';
  } else if (diffDays < 7) {
    timeStr = `${diffDays} 天前`;
  } else if (diffDays < 30) {
    timeStr = `${Math.floor(diffDays / 7)} 周前`;
  } else {
    timeStr = `${Math.floor(diffDays / 30)} 个月前`;
  }

  return {
    id: row.id,
    articleId: row.article_id,
    author: row.author,
    avatar: row.avatar,
    avatarColor: row.avatar_color,
    content: row.content,
    createdAt: timeStr
  };
}

// ========== 文章 API ==========

// 获取分类列表
router.get('/categories', (req, res) => {
  res.json(categories);
});

// 获取文章列表
router.get('/articles', (req, res) => {
  try {
    const { category, keyword, page = 1, limit = 10 } = req.query;
    
    let sql = 'SELECT * FROM articles WHERE status = ?';
    const params = ['published'];
    
    // 分类筛选
    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    // 关键词搜索
    if (keyword) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const articles = db.prepare(sql).all(...params).map(formatArticle);
    
    res.json({
      success: true,
      data: articles,
      total: articles.length
    });
  } catch (error) {
    console.error('获取文章列表失败:', error);
    res.status(500).json({ success: false, error: '获取文章列表失败' });
  }
});

// 获取精选文章
router.get('/articles/featured', (req, res) => {
  try {
    const articles = db.prepare(`
      SELECT * FROM articles 
      WHERE status = 'published' 
      ORDER BY views DESC, likes DESC 
      LIMIT 3
    `).all().map(formatArticle);
    
    res.json({ success: true, data: articles });
  } catch (error) {
    console.error('获取精选文章失败:', error);
    res.status(500).json({ success: false, error: '获取精选文章失败' });
  }
});

// 获取单篇文章
router.get('/articles/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    
    if (!article) {
      return res.status(404).json({ success: false, error: '文章不存在' });
    }
    
    // 增加阅读量
    db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(id);
    
    res.json({ success: true, data: formatArticle(article) });
  } catch (error) {
    console.error('获取文章失败:', error);
    res.status(500).json({ success: false, error: '获取文章失败' });
  }
});

// 创建文章
router.post('/articles', (req, res) => {
  try {
    const { title, description, content, category, tags, visibility, status } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: '标题不能为空' });
    }
    
    // 根据分类获取颜色
    const cat = categories.find(c => c.id === category);
    const color = cat ? cat.color : '#00F5D4';
    
    // 生成描述（如果没有提供）
    const finalDescription = description || (content ? content.substring(0, 150) + '...' : '');
    
    const result = db.prepare(`
      INSERT INTO articles (title, description, content, category, tags, visibility, status, color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(),
      finalDescription,
      content || '',
      category || 'frontend',
      JSON.stringify(tags || []),
      visibility || 'public',
      status || 'published',
      color
    );
    
    const newArticle = db.prepare('SELECT * FROM articles WHERE id = ?').get(result.lastInsertRowid);
    
    res.json({ 
      success: true, 
      data: formatArticle(newArticle),
      message: status === 'draft' ? '草稿保存成功' : '文章发布成功'
    });
  } catch (error) {
    console.error('创建文章失败:', error);
    res.status(500).json({ success: false, error: '创建文章失败' });
  }
});

// 更新文章
router.put('/articles/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body; // 从请求体获取邮箱

    // 验证邮箱是否在白名单中
    if (!isEmailWhitelisted(email)) {
      return res.status(403).json({ success: false, error: '只有白名单邮箱的用户可以编辑文章' });
    }

    const { title, description, content, category, tags, visibility, status } = req.body;

    const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: '文章不存在' });
    }

    const cat = categories.find(c => c.id === category);
    const color = cat ? cat.color : existing.color;
    
    db.prepare(`
      UPDATE articles 
      SET title = ?, description = ?, content = ?, category = ?, tags = ?, 
          visibility = ?, status = ?, color = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || existing.title,
      description || existing.description,
      content !== undefined ? content : existing.content,
      category || existing.category,
      tags ? JSON.stringify(tags) : existing.tags,
      visibility || existing.visibility,
      status || existing.status,
      color,
      id
    );
    
    const updated = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    
    res.json({ success: true, data: formatArticle(updated) });
  } catch (error) {
    console.error('更新文章失败:', error);
    res.status(500).json({ success: false, error: '更新文章失败' });
  }
});

// 删除文章
router.delete('/articles/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: '文章不存在' });
    }
    
    db.prepare('DELETE FROM articles WHERE id = ?').run(id);
    
    res.json({ success: true, message: '文章删除成功' });
  } catch (error) {
    console.error('删除文章失败:', error);
    res.status(500).json({ success: false, error: '删除文章失败' });
  }
});

// 点赞文章
router.post('/articles/:id/like', (req, res) => {
  try {
    const { id } = req.params;
    
    db.prepare('UPDATE articles SET likes = likes + 1 WHERE id = ?').run(id);
    
    const article = db.prepare('SELECT likes FROM articles WHERE id = ?').get(id);
    
    res.json({ success: true, likes: article?.likes || 0 });
  } catch (error) {
    console.error('点赞失败:', error);
    res.status(500).json({ success: false, error: '点赞失败' });
  }
});

// ========== 评论 API ==========

// 获取文章评论
router.get('/articles/:id/comments', (req, res) => {
  try {
    const { id } = req.params;
    
    const comments = db.prepare(`
      SELECT * FROM comments 
      WHERE article_id = ? 
      ORDER BY created_at DESC
    `).all(id).map(formatComment);
    
    res.json({ success: true, data: comments });
  } catch (error) {
    console.error('获取评论失败:', error);
    res.status(500).json({ success: false, error: '获取评论失败' });
  }
});

// 添加评论
router.post('/articles/:id/comments', (req, res) => {
  try {
    const { id } = req.params;
    const { author, content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: '评论内容不能为空' });
    }
    
    // 检查文章是否存在
    const article = db.prepare('SELECT id FROM articles WHERE id = ?').get(id);
    if (!article) {
      return res.status(404).json({ success: false, error: '文章不存在' });
    }
    
    const authorName = author || '游客';
    const avatar = authorName.charAt(0);
    const colors = ['#FF6B6B', '#4ECDC4', '#A78BFA', '#F59E0B', '#00F5D4'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    
    const result = db.prepare(`
      INSERT INTO comments (article_id, author, avatar, avatar_color, content)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, authorName, avatar, avatarColor, content.trim());
    
    const newComment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
    
    res.json({ success: true, data: formatComment(newComment) });
  } catch (error) {
    console.error('添加评论失败:', error);
    res.status(500).json({ success: false, error: '添加评论失败' });
  }
});

// 删除评论
router.delete('/comments/:commentId', (req, res) => {
  try {
    const { commentId } = req.params;
    
    const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
    if (!existing) {
      return res.status(404).json({ success: false, error: '评论不存在' });
    }
    
    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
    
    res.json({ success: true, message: '评论删除成功' });
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({ success: false, error: '删除评论失败' });
  }
});

// ========== 草稿 API ==========

// 获取草稿列表
router.get('/drafts', (req, res) => {
  try {
    const drafts = db.prepare(`
      SELECT id, title, updated_at FROM drafts 
      ORDER BY updated_at DESC
    `).all().map(row => ({
      id: row.id,
      title: row.title,
      updatedAt: row.updated_at
    }));
    
    res.json({ success: true, data: drafts });
  } catch (error) {
    console.error('获取草稿失败:', error);
    res.status(500).json({ success: false, error: '获取草稿失败' });
  }
});

// 保存草稿
router.post('/drafts', (req, res) => {
  try {
    const { title, content, category, tags } = req.body;
    
    const result = db.prepare(`
      INSERT INTO drafts (title, content, category, tags)
      VALUES (?, ?, ?, ?)
    `).run(
      title || '无标题',
      content || '',
      category || 'frontend',
      JSON.stringify(tags || [])
    );
    
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('保存草稿失败:', error);
    res.status(500).json({ success: false, error: '保存草稿失败' });
  }
});

export default router;
