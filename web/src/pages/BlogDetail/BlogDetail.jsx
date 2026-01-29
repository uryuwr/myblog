import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Eye, Heart, Calendar, Share2, Bookmark,
  Copy, Check, Trash2, Edit
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './BlogDetail.css';

// 用户信息（静态数据）
const userProfile = {
  name: '陈煌',
  title: '后端开发工程师',
  avatar: '陈',
};

export default function BlogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteArticleDialog, setShowDeleteArticleDialog] = useState(false);
  const [showDeleteCommentDialog, setShowDeleteCommentDialog] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getArticle(id),
      api.getComments(id)
    ]).then(([articleData, commentsData]) => {
      setArticle(articleData);
      setComments(commentsData);
      setLoading(false);
    });
  }, [id]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    // 使用登录用户的邮箱作为作者名，未登录则显示"游客"
    const authorName = user?.email || '游客';
    const comment = await api.addComment(id, newComment, authorName);
    setComments([comment, ...comments]);
    setNewComment('');
  };

  // 删除文章
  const handleDeleteArticle = async () => {
    setShowDeleteArticleDialog(true);
  };

  const confirmDeleteArticle = async () => {
    try {
      await api.deleteArticle(id);
      setShowDeleteArticleDialog(false);
      navigate('/blog');
    } catch (error) {
      setShowDeleteArticleDialog(false);
    }
  };

  // 删除评论
  const handleDeleteComment = (commentId) => {
    setCommentToDelete(commentId);
    setShowDeleteCommentDialog(true);
  };

  const confirmDeleteComment = async () => {
    try {
      await api.deleteComment(commentToDelete);
      setComments(comments.filter(c => c.id !== commentToDelete));
      setShowDeleteCommentDialog(false);
      setCommentToDelete(null);
    } catch (error) {
      setShowDeleteCommentDialog(false);
      setCommentToDelete(null);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = (content) => {
    // 简单的 Markdown 渲染
    const lines = content.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeContent = '';
    let codeLanguage = '';

    lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // 结束代码块
          elements.push(
            <div key={`code-${index}`} className="code-block">
              <div className="code-header">
                <span className="code-lang">{codeLanguage || 'code'}</span>
                <button 
                  className="copy-btn"
                  onClick={() => handleCopyCode(codeContent)}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
              <pre className="code-body">
                <code>{codeContent.trim()}</code>
              </pre>
            </div>
          );
          codeContent = '';
          inCodeBlock = false;
        } else {
          // 开始代码块
          codeLanguage = line.replace('```', '').trim();
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeContent += line + '\n';
        return;
      }

      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="content-h2">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="content-h3">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.trim()) {
        // 处理行内代码
        const parts = line.split(/(`[^`]+`)/g);
        const processed = parts.map((part, i) => {
          if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className="inline-code">{part.slice(1, -1)}</code>;
          }
          return part;
        });
        elements.push(
          <p key={index} className="content-p">{processed}</p>
        );
      }
    });

    return elements;
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <div className="loading-state">加载中...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <div className="not-found">文章不存在</div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="detail-main">
        {/* Article Header */}
        <header className="article-header">
          <div className="header-actions">
            <Link to="/blog" className="back-btn">
              <ArrowLeft size={18} />
              返回列表
            </Link>
            {user && user.email && (
              <Link to={`/write?id=${id}`} className="edit-article-btn">
                <Edit size={16} />
                编辑文章
              </Link>
            )}
            <button className="delete-article-btn" onClick={handleDeleteArticle}>
              <Trash2 size={16} />
              删除文章
            </button>
          </div>

          <div className="article-tags">
            {article.tags?.map(tag => (
              <span 
                key={tag} 
                className="tag"
                style={{ '--tag-color': article.color }}
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="article-title">{article.title}</h1>

          <div className="article-meta">
            <span className="meta-item">
              <Eye size={16} />
              {article.views} 阅读
            </span>
            <span className="meta-item">
              <Heart size={16} />
              {article.likes} 喜欢
            </span>
            <span className="meta-item">
              <Calendar size={16} />
              {article.createdAt}
            </span>
          </div>
        </header>

        {/* Article Content */}
        <article className="article-content">
          {renderContent(article.content)}
        </article>

        {/* Author Card */}
        <div className="author-card">
          <div className="author-avatar">
            {userProfile.avatar}
          </div>
          <div className="author-info">
            <h4 className="author-name">{userProfile.name}</h4>
            <p className="author-bio">
              {userProfile.title}，热爱分享技术，专注于 React 生态和 Node.js 后端开发。
            </p>
          </div>
          <button className="follow-btn">关注</button>
        </div>

        {/* Action Bar */}
        <div className="action-bar">
          <button 
            className={`action-btn like ${liked ? 'active' : ''}`}
            onClick={() => setLiked(!liked)}
          >
            <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
            喜欢 ({article.likes + (liked ? 1 : 0)})
          </button>
          <button className="action-btn">
            <Share2 size={20} />
            分享
          </button>
          <button 
            className={`action-btn ${bookmarked ? 'active' : ''}`}
            onClick={() => setBookmarked(!bookmarked)}
          >
            <Bookmark size={20} fill={bookmarked ? 'currentColor' : 'none'} />
            收藏
          </button>
        </div>

        {/* Comments Section */}
        <section className="comments-section">
          <h3 className="comments-title">💬 评论 ({comments.length})</h3>

          <form className="comment-form" onSubmit={handleSubmitComment}>
            <div className={`comment-avatar ${user ? 'logged-in' : 'guest'}`}>
              {user ? user.email.charAt(0).toUpperCase() : '游'}
            </div>
            <div className="comment-input-wrap">
              <textarea
                className="comment-input"
                placeholder={user ? `以 ${user.email} 身份评论...` : "写下你的评论..."}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <button type="submit" className="submit-btn">
                发表评论
              </button>
            </div>
          </form>

          <div className="comments-list">
            {comments.map(comment => (
              <div key={comment.id} className="comment-item">
                <div 
                  className="comment-avatar"
                  style={{ '--avatar-color': comment.avatarColor }}
                >
                  {comment.avatar}
                </div>
                <div className="comment-content">
                  <div className="comment-header">
                    <span className="comment-author">{comment.author}</span>
                    <span className="comment-time">{comment.createdAt}</span>
                    <button 
                      className="delete-comment-btn"
                      onClick={() => handleDeleteComment(comment.id)}
                      title="删除评论"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="comment-text">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 删除文章确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteArticleDialog}
        title="删除文章"
        message="确定要删除这篇文章吗？此操作不可撤销。"
        onConfirm={confirmDeleteArticle}
        onCancel={() => setShowDeleteArticleDialog(false)}
        confirmText="删除"
        cancelText="取消"
        type="danger"
      />

      {/* 删除评论确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteCommentDialog}
        title="删除评论"
        message="确定要删除这条评论吗？"
        onConfirm={confirmDeleteComment}
        onCancel={() => {
          setShowDeleteCommentDialog(false);
          setCommentToDelete(null);
        }}
        confirmText="删除"
        cancelText="取消"
        type="danger"
      />
    </div>
  );
}
