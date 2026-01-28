import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TerminalProvider } from './contexts/TerminalContext';
import Home from './pages/Home';
import BlogList from './pages/BlogList';
import BlogDetail from './pages/BlogDetail';
import WriteArticle from './pages/WriteArticle';
import Piweisi from './pages/Piweisi';

function App() {
  return (
    <AuthProvider>
      <TerminalProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:id" element={<BlogDetail />} />
            <Route path="/write" element={<WriteArticle />} />
            <Route path="/piweisi" element={<Piweisi />} />
          </Routes>
        </BrowserRouter>
      </TerminalProvider>
    </AuthProvider>
  );
}

export default App
