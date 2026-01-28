import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '../../components/Navbar';
import ArticleCard from '../../components/ArticleCard';
import { categories, api } from '../../mock/data';
import './BlogList.css';

export default function BlogList() {
  const [articles, setArticles] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const articlesPerPage = 5;

  useEffect(() => {
    setLoading(true);
    api.getArticles(activeCategory, searchKeyword).then(data => {
      setArticles(data);
      setLoading(false);
      setCurrentPage(1);
    });
  }, [activeCategory, searchKeyword]);

  const totalPages = Math.ceil(articles.length / articlesPerPage);
  const paginatedArticles = articles.slice(
    (currentPage - 1) * articlesPerPage,
    currentPage * articlesPerPage
  );

  const handleSearch = (e) => {
    e.preventDefault();
    // 搜索已通过 useEffect 自动触发
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="blog-main">
        {/* Page Header */}
        <header className="blog-header">
          <div className="header-badge">// 技术分享</div>
          <h1 className="header-title">博客文章</h1>
          <p className="header-subtitle">分享技术心得，记录成长历程</p>
        </header>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="category-filters">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`filter-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                style={{ '--cat-color': cat.color }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <form className="search-box" onSubmit={handleSearch}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="搜索文章..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </form>
        </div>

        {/* Articles List */}
        <div className="articles-list">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : paginatedArticles.length > 0 ? (
            paginatedArticles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))
          ) : (
            <div className="no-results">暂无文章</div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn nav"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft size={18} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`page-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              className="page-btn nav"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
