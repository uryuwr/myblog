import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Terminal from '../../components/Terminal';
import './Piweisi.css';

// 导入 JPG 图片
import catNormal from '../../assets/1.jpg';
import catWorking from '../../assets/2.jpg';

export default function Piweisi() {
  const [isWorking, setIsWorking] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 可以通过终端事件来切换状态
  const handleTerminalActivity = (active) => {
    setIsWorking(active);
  };

  // 获取当前图片源
  const currentImage = isWorking ? catWorking : catNormal;

  return (
    <div className="page-wrapper piweisi-page">
      <Navbar />
      
      <main className="piweisi-main">
        <div className="piweisi-content">
          {/* 桌面端 - 左侧皮维斯虚拟形象面板 */}
          {!isMobile && (
            <aside className="avatar-panel">
              <div className="avatar-glow">
                <div className={`avatar-frame ${isWorking ? 'working' : ''}`}>
                  <img 
                    src={currentImage} 
                    alt="皮维斯" 
                    className="avatar-image"
                  />
                </div>
              </div>

              <h1 className="cat-name">皮维斯</h1>
              <p className="cat-subtitle">Pi + Service = Piweisi</p>

              <div className="divider"></div>

              <p className="cat-description">
                主人，我是皮维斯~
                <br />随时待命，准备帮你干活！
                <br /><br />
                有什么需要尽管吩咐，
                <br />我会尽力完成的喵~
              </p>

            </aside>
          )}

          {/* 终端区域 */}
          <section className="terminal-section">
            {/* 移动端 - 小头像浮动在终端右上角 */}
            {isMobile && (
              <div className={`mobile-avatar ${isWorking ? 'working' : ''}`}>
                <img 
                  src={currentImage} 
                  alt="皮维斯" 
                  className="mobile-avatar-image"
                />
              </div>
            )}
            <Terminal onActivityChange={handleTerminalActivity} />
          </section>
        </div>
      </main>

      {/* 桌面端显示页脚 */}
      {!isMobile && (
        <footer className="piweisi-footer">
          <span>// 皮维斯 - 你的智能伙伴 🐱 Powered by AI</span>
        </footer>
      )}
    </div>
  );
}
