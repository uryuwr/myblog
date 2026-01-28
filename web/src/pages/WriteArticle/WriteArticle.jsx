import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bold, Italic, Code, Link, Image, List, Quote,
  Upload, ChevronDown, Eye
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import LoginModal from '../../components/LoginModal/LoginModal';
import UserInfo from '../../components/UserInfo';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import './WriteArticle.css';

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

  useEffect(() => {
    api.getDrafts().then(setDrafts);
  }, []);

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
    alert('草稿已保存！');
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      alert('请输入文章标题');
      return;
    }
    if (!content.trim()) {
      alert('请输入文章内容');
      return;
    }

    setSaving(true);
    await api.saveArticle({ 
      title, 
      content, 
      tags, 
      category: selectedCategory,
      visibility,
      status: 'published'
    });
    setSaving(false);
    alert('文章发布成功！');
    navigate('/blog');
  };

  const handlePreview = () => {
    // 在新窗口预览
    const previewContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>预览: ${title}</title>
        <style>
          body { font-family: monospace; background: #0A0A12; color: #C0C0D0; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #FFFFFF; }
          pre { background: #12121A; padding: 16px; border-radius: 8px; overflow-x: auto; }
          code { color: #00F5D4; }
        </style>
      </head>
      <body>
        <h1>${title || '无标题'}</h1>
        <div>${content.replace(/\n/g, '<br>')}</div>
      </body>
      </html>
    `;
    const blob = new Blob([previewContent], { type: 'text/html' });
    window.open(URL.createObjectURL(blob));
  };

  const getCategoryById = (id) => categories.find(c => c.id === id);

  const tagColors = ['#00F5D4', '#FF6B6B', '#A78BFA', '#F59E0B', '#4ECDC4'];

  // 未登录时显示登录提示
  if (!token) {
    return (
      <div className="page-wrapper write-page">
        <div className="top-bar">
          <div className="top-left">
            <button className="back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} />
              返回
            </button>
            <h1 className="page-title">✍️ 写文章</h1>
          </div>
        </div>
        
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
      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-left">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
            返回
          </button>
          <h1 className="page-title">✍️ 写文章</h1>
        </div>
        <div className="top-right">
          <button className="action-btn draft" onClick={handleSaveDraft} disabled={saving}>
            {saving ? '保存中...' : '存草稿'}
          </button>
          <button className="action-btn preview" onClick={handlePreview}>
            <Eye size={16} />
            预览
          </button>
          <button className="action-btn publish" onClick={handlePublish} disabled={saving}>
            {saving ? '发布中...' : '发布文章'}
          </button>
          {user && <UserInfo variant="default" />}
        </div>
      </div>

      <main className="write-main">
        {/* Editor Area */}
        <div className="editor-area">
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

          {/* Markdown Editor */}
          <textarea
            className="md-editor"
            placeholder="开始写作...支持 Markdown 语法"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
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
