import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Bold, Italic, Code, Link, Image, List, Quote,
  Upload, ChevronDown, Eye, EyeOff, Columns, Copy, Check
} from 'lucide-react';
import Navbar from '../../components/Navbar/Navbar';
import LoginModal from '../../components/LoginModal/LoginModal';
import UserInfo from '../../components/UserInfo';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import './WriteArticle.css';

// Markdown 渲染函数
const renderMarkdown = (content) => {
  if (!content) return '';
  
  let html = content;
  
  // 代码块 (```code```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<div class="code-block"><div class="code-header"><span class="code-lang">${lang || 'code'}</span></div><pre class="code-body"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim()}</code></pre></div>`;
  });
  
  // 行内代码 (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // 标题
  html = html.replace(/^### (.+)$/gm, '<h3 class="content-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="content-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="content-h1">$1</h1>');
  
  // 粗体和斜体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  
  // 图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:16px 0;" />');
  
  // 引用
  html = html.replace(/^> (.+)$/gm, '<blockquote class="content-quote">$1</blockquote>');
  
  // 列表
  html = html.replace(/^- (.+)$/gm, '<li class="content-li">$1</li>');
  html = html.replace(/(<li class="content-li">.*<\/li>\n?)+/g, '<ul class="content-ul">$&</ul>');
  
  // 段落（处理剩余的普通文本行）
  const lines = html.split('\n');
  html = lines.map(line => {
    // 跳过已经是 HTML 标签的行
    if (line.trim() === '' || 
        line.startsWith('<h') || 
        line.startsWith('<div') || 
        line.startsWith('<pre') ||
        line.startsWith('<ul') ||
        line.startsWith('<li') ||
        line.startsWith('<blockquote') ||
        line.startsWith('</')) {
      return line;
    }
    return `<p class="content-p">${line}</p>`;
  }).join('\n');
  
  return html;
};

// 分类数据（静态）
const categories = [
  { id: 'all', name: '全部', color: '#00F5D4' },
  { id: 'frontend', name: '前端', color: '#00F5D4' },
  { id: 'backend', name: '后端', color: '#A78BFA' },
  { id: 'tools', name: '工具', color: '#F59E0B' },
  { id: 'thoughts', name: '随想', color: '#FF6B6B' }
];

export default function WriteArticle() {
  const navigate = useNavigate();
  const { isAuthenticated, user, token, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const articleId = searchParams.get('id');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('frontend');
  const [tags, setTags] = useState(['React', '性能优化']);
  const [visibility, setVisibility] = useState('public');
  const [drafts, setDrafts] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false); // 实时预览开关
  const [copied, setCopied] = useState(false);

  // 使用 useMemo 缓存渲染的 Markdown
  const renderedContent = useMemo(() => renderMarkdown(content), [content]);

  useEffect(() => {
    api.getDrafts().then(setDrafts);
  }, []);

  // 加载文章数据（编辑模式）
  useEffect(() => {
    if (articleId && token) {
      api.getArticle(articleId).then(article => {
        if (article) {
          setTitle(article.title);
          setContent(article.content);
          setSelectedCategory(article.category);
          setTags(article.tags || ['React', '性能优化']);
          setVisibility(article.visibility);
          setIsEditMode(true);
        }
      }).catch(error => {
        console.error('加载文章失败:', error);
        navigate('/blog');
      });
    }
  }, [articleId, token]);

  const toolbarActions = [
    { icon: Bold, label: '加粗', action: () => insertText('**', '**') },
    { icon: Italic, label: '斜体', action: () => insertText('*', '*') },
    { icon: Code, label: '代码', action: () => insertText('`', '`') },
    { icon: Link, label: '链接', action: () => insertText('[', '](url)') },
    { icon: Image, label: '图片', action: () => insertText('![alt](', ')') },
    { icon: List, label: '列表', action: () => insertText('\n- ', '') },
    { icon: Quote, label: '引用', action: () => insertText('\n> ', '') },
  ];

  const insertText = (before, after) => {
    const textarea = document.querySelector('.md-editor');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selected + after + content.substring(end);
    setContent(newContent);
  };

  const handleAddTag = () => {
    const newTag = prompt('输入新标签:');
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    await api.saveArticle({ title, content, tags, category: selectedCategory, status: 'draft' });
    setSaving(false);
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      return;
    }
    if (!content.trim()) {
      return;
    }

    setSaving(true);

    if (isEditMode && articleId) {
      // 编辑模式：更新现有文章
      await api.updateArticle(articleId, {
        title,
        content,
        tags,
        category: selectedCategory,
        visibility,
        status: 'published',
        email: user.email
      });
    } else {
      // 新建模式：创建新文章
      await api.saveArticle({
        title,
        content,
        tags,
        category: selectedCategory,
        visibility,
        status: 'published'
      });
    }

    setSaving(false);
    navigate('/blog');
  };

  const handlePreview = () => {
    // 在新窗口预览（带正确的字符编码和 Markdown 渲染）
    const previewContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>预览: ${title || '无标题'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'SF Mono', 'Fira Code', monospace; 
      background: #0A0A12; 
      color: #C0C0D0; 
      padding: 60px 40px; 
      max-width: 900px; 
      margin: 0 auto; 
      line-height: 1.8;
    }
    h1 { color: #FFFFFF; font-size: 2.5rem; margin-bottom: 32px; font-weight: 700; }
    h2.content-h2 { color: #00F5D4; font-size: 1.5rem; margin: 40px 0 20px; font-weight: 600; }
    h3.content-h3 { color: #FFFFFF; font-size: 1.25rem; margin: 32px 0 16px; font-weight: 600; }
    p.content-p { margin-bottom: 16px; font-size: 1rem; }
    .code-block { 
      background: #12121A; 
      border: 1px solid rgba(0, 245, 212, 0.2);
      border-radius: 12px; 
      overflow: hidden;
      margin: 24px 0;
    }
    .code-header {
      background: #1a1a2e;
      padding: 8px 16px;
      border-bottom: 1px solid rgba(0, 245, 212, 0.1);
    }
    .code-lang { color: #00F5D4; font-size: 0.75rem; text-transform: uppercase; }
    .code-body { padding: 16px; overflow-x: auto; margin: 0; }
    .code-body code { color: #E0E0E0; font-size: 0.875rem; }
    .inline-code { 
      background: #1a1a2e; 
      padding: 2px 8px; 
      border-radius: 4px; 
      color: #00F5D4;
      font-size: 0.9em;
    }
    .content-quote {
      border-left: 3px solid #A78BFA;
      padding: 12px 20px;
      background: rgba(167, 139, 250, 0.1);
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    .content-ul { padding-left: 24px; margin: 16px 0; }
    .content-li { margin-bottom: 8px; }
    a { color: #00F5D4; text-decoration: none; }
    a:hover { text-decoration: underline; }
    strong { color: #FFFFFF; }
    em { color: #A78BFA; }
  </style>
</head>
<body>
  <h1>${title || '无标题'}</h1>
  <article>${renderMarkdown(content)}</article>
</body>
</html>`;
    const blob = new Blob([previewContent], { type: 'text/html;charset=utf-8' });
    window.open(URL.createObjectURL(blob));
  };

  // 切换实时预览
  const toggleLivePreview = () => {
    setShowPreview(!showPreview);
  };

  const getCategoryById = (id) => categories.find(c => c.id === id);

  const tagColors = ['#00F5D4', '#FF6B6B', '#A78BFA', '#F59E0B', '#4ECDC4'];

  // 未登录时显示登录提示
  if (!token) {
    return (
      <div className="page-wrapper write-page">
        <Navbar />
        <main className="write-main">
          <div className="login-required-container">
            <div className="login-required-card">
              <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" className="lock-icon">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
              <h2>需要登录</h2>
              <p>请先登录后再写文章</p>
              <button className="login-btn" onClick={() => setShowLoginModal(true)}>
                登录
              </button>
            </div>
          </div>
        </main>

        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => setShowLoginModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="page-wrapper write-page">
      <Navbar />
      {/* Action Bar */}
      <div className="write-action-bar">
        <h1 className="write-page-title">
          {isEditMode ? '编辑文章' : '写文章'}
        </h1>
        <div className="write-action-buttons">
          <button className="action-btn draft" onClick={handleSaveDraft} disabled={saving}>
            {saving ? '保存中...' : '存草稿'}
          </button>
          <button
            className={`action-btn preview-toggle ${showPreview ? 'active' : ''}`}
            onClick={toggleLivePreview}
            title={showPreview ? '关闭实时预览' : '开启实时预览'}
          >
            <Columns size={16} />
            {showPreview ? '关闭预览' : '实时预览'}
          </button>
          <button className="action-btn preview" onClick={handlePreview}>
            <Eye size={16} />
            新窗口
          </button>
          <button className="action-btn publish" onClick={handlePublish} disabled={saving}>
            {saving ? '发布中...' : (isEditMode ? '更新文章' : '发布文章')}
          </button>
        </div>
      </div>

      <main className="write-main">
        {/* Editor Area */}
        <div className={`editor-area ${showPreview ? 'with-preview' : ''}`}>
          {/* Title Input */}
          <input
            type="text"
            className="title-input"
            placeholder="请输入文章标题..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Tags */}
          <div className="tags-section">
            <span className="tags-label">标签:</span>
            {tags.map((tag, index) => (
              <span 
                key={tag} 
                className="tag"
                style={{ '--tag-color': tagColors[index % tagColors.length] }}
                onClick={() => handleRemoveTag(tag)}
              >
                {tag}
              </span>
            ))}
            <button className="add-tag-btn" onClick={handleAddTag}>
              + 添加标签
            </button>
          </div>

          {/* Markdown Toolbar */}
          <div className="md-toolbar">
            {toolbarActions.map(({ icon: Icon, label, action }) => (
              <button 
                key={label} 
                className="toolbar-btn" 
                onClick={action}
                title={label}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>

          {/* Editor and Preview Container */}
          <div className={`editor-preview-container ${showPreview ? 'split' : ''}`}>
            {/* Markdown Editor */}
            <textarea
              className="md-editor"
              placeholder="开始写作...支持 Markdown 语法"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            
            {/* Live Preview Panel */}
            {showPreview && (
              <div className="live-preview-panel">
                <div className="preview-header">
                  <span className="preview-title">📖 实时预览</span>
                </div>
                <div 
                  className="preview-content"
                  dangerouslySetInnerHTML={{ __html: renderedContent || '<p class="empty-hint">开始输入内容查看预览...</p>' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          {/* Settings Card */}
          <div className="settings-card">
            <h3 className="card-title">⚙️ 文章设置</h3>

            {/* Category */}
            <div className="form-group">
              <label>分类</label>
              <div 
                className="select-box"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              >
                <span>{getCategoryById(selectedCategory)?.name || '选择分类'}</span>
                <ChevronDown size={16} />
                {showCategoryDropdown && (
                  <div className="dropdown">
                    {categories.filter(c => c.id !== 'all').map(cat => (
                      <div 
                        key={cat.id}
                        className={`dropdown-item ${selectedCategory === cat.id ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCategory(cat.id);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        {cat.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Visibility */}
            <div className="form-group">
              <label>可见性</label>
              <div 
                className="select-box"
                onClick={() => setShowVisibilityDropdown(!showVisibilityDropdown)}
              >
                <span className={visibility === 'public' ? 'text-primary' : ''}>
                  {visibility === 'public' ? '公开' : '私密'}
                </span>
                <ChevronDown size={16} />
                {showVisibilityDropdown && (
                  <div className="dropdown">
                    <div 
                      className={`dropdown-item ${visibility === 'public' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setVisibility('public');
                        setShowVisibilityDropdown(false);
                      }}
                    >
                      公开
                    </div>
                    <div 
                      className={`dropdown-item ${visibility === 'private' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setVisibility('private');
                        setShowVisibilityDropdown(false);
                      }}
                    >
                      私密
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cover Image */}
            <div className="form-group">
              <label>封面图</label>
              <div className="upload-box">
                <Upload size={24} />
                <span>点击上传封面图</span>
              </div>
            </div>
          </div>

          {/* Drafts Card */}
          <div className="drafts-card">
            <h3 className="card-title">📝 草稿箱 ({drafts.length})</h3>
            <div className="drafts-list">
              {drafts.map(draft => (
                <div key={draft.id} className="draft-item">
                  <span className="draft-title">{draft.title}</span>
                  <span className="draft-time">{draft.updatedAt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
