import { Link, useLocation } from 'react-router-dom';
import { Code2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import UserInfo from '../UserInfo';
import './Navbar.css';

export default function Navbar() {
  const location = useLocation();
  const { user } = useAuth();
  
  const navLinks = [
    { path: '/', label: '首页' },
    { path: '/blog', label: '博客' },
    { path: '/about', label: '关于' },
    { path: '/write', label: '写文章' }
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">
            <Code2 size={20} />
          </div>
          <span className="logo-text">陈煌的技术博客</span>
        </Link>

        <div className="navbar-links">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {user && <UserInfo variant="default" />}
      </div>
    </nav>
  );
}
