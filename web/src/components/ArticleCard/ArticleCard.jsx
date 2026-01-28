import { Link } from 'react-router-dom';
import { Eye, Heart, ArrowRight } from 'lucide-react';
import './ArticleCard.css';

export default function ArticleCard({ article, variant = 'default' }) {
  const { id, title, description, category, tags, createdAt, views, likes, color } = article;

  if (variant === 'featured') {
    return (
      <Link to={`/blog/${id}`} className="article-card featured" style={{ '--accent-color': color }}>
        <div className="card-icon">
          {category === 'frontend' && '</>'}
          {category === 'backend' && '{ }'}
          {category === 'tools' && '/>'}
          {category === 'thoughts' && '...'}
        </div>
        <h3 className="card-title">{title}</h3>
        <p className="card-description">{description}</p>
        <div className="card-meta">
          <span className="meta-date">{createdAt}</span>
        </div>
      </Link>
    );
  }

  return (
    <div className="article-card list-item" style={{ '--accent-color': color }}>
      <div className="card-accent"></div>
      <div className="card-content">
        <div className="card-header">
          <div className="card-tags">
            {tags?.slice(0, 2).map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        </div>
        <Link to={`/blog/${id}`}>
          <h3 className="card-title">{title}</h3>
        </Link>
        <p className="card-description">{description}</p>
        <div className="card-footer">
          <div className="card-stats">
            <span className="stat">
              <Eye size={14} />
              {views}
            </span>
            <span className="stat">
              <Heart size={14} />
              {likes}
            </span>
            <span className="stat-date">{createdAt}</span>
          </div>
          <Link to={`/blog/${id}`} className="read-btn">
            阅读
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
