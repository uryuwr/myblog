import { useAuth } from '../../contexts/AuthContext';
import './UserInfo.css';

/**
 * 统一的用户登录信息显示组件
 * 
 * @param {Object} props
 * @param {'default' | 'compact' | 'outline'} props.variant - 组件变体
 * @param {string} props.className - 额外的 CSS 类名
 */
function UserInfo({ variant = 'default', className = '' }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const handleLogout = (e) => {
    e.stopPropagation();
    logout();
  };

  return (
    <div className={`user-info user-info--${variant} ${className}`}>
      <span className="user-info__email">{user.email}</span>
      <button 
        className="user-info__logout-btn"
        onClick={handleLogout}
        title="退出登录"
      >
        退出
      </button>
    </div>
  );
}

export default UserInfo;
