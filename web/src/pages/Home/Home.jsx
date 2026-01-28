import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Github, ArrowRight, Sparkles } from 'lucide-react';
import Navbar from '../../components/Navbar';
import ArticleCard from '../../components/ArticleCard';
import Terminal from '../../components/Terminal';
import { userProfile, api } from '../../mock/data';
import './Home.css';

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

          <div className="hero-visual">
            <Terminal />
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
