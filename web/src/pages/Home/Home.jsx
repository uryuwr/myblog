import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Github, ArrowRight, Sparkles, Cat } from 'lucide-react';
import Navbar from '../../components/Navbar';
import ArticleCard from '../../components/ArticleCard';
import { api } from '../../services/api';
import './Home.css';

// 用户信息（静态数据）
const userProfile = {
  name: '陈煌',
  title: '后端开发工程师',
  avatar: '陈',
  bio: '热爱编程，专注于 服务端开发，喜欢探索新技术。在这里分享我的技术心得与成长经历，希望能帮助到同样热爱技术的你。',
  skills: ['Java', 'Spring Boot', 'vibe coding', 'kafka'],
  social: {
    github: 'https://github.com/uryuwr',
    email: '289561901@qq.com'
  }
};

export default function Home() {
  const [featuredArticles, setFeaturedArticles] = useState([]);

  useEffect(() => {
    api.getFeaturedArticles().then(setFeaturedArticles);
  }, []);

  return (
    <div className="page-wrapper">
      <Navbar />
      
      <main className="home-main">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={14} />
              <span>欢迎来到我的技术空间</span>
            </div>
            
            <h1 className="hero-title">
              我是{userProfile.name}
            </h1>
            <h2 className="hero-subtitle">
              {userProfile.title}
            </h2>
            
            <p className="hero-description">
              {userProfile.bio}
            </p>

            <div className="hero-skills">
              {userProfile.skills.map(skill => (
                <span key={skill} className="skill-tag">{skill}</span>
              ))}
            </div>

            <div className="hero-actions">
              <Link to="/blog" className="btn btn-primary">
                <BookOpen size={18} />
                阅读博客
              </Link>
              <a 
                href={userProfile.social.github} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                <Github size={18} />
                GitHub
              </a>
            </div>
          </div>

          {/* 右侧视觉区域 - 皮维斯入口卡片 */}
          <div className="hero-visual">
            <Link to="/piweisi" className="piweisi-card">
              <div className="piweisi-card-glow"></div>
              <div className="piweisi-card-content">
                <div className="piweisi-icon">
                  <Cat size={48} />
                </div>
                <h3 className="piweisi-card-title">皮维斯</h3>
                <p className="piweisi-card-desc">
                  我的智能助手，随时为你服务
                </p>
                <span className="piweisi-card-link">
                  开始对话 <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* Featured Articles */}
        <section className="featured-section">
          <div className="section-header">
            <div className="section-badge">
              <ArrowRight size={14} />
              <span>最新内容</span>
            </div>
            <h2 className="section-title">精选博客</h2>
            <Link to="/blog" className="view-all">
              查看全部 <ArrowRight size={16} />
            </Link>
          </div>

          <div className="featured-grid">
            {featuredArticles.map(article => (
              <ArticleCard 
                key={article.id} 
                article={article} 
                variant="featured"
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
