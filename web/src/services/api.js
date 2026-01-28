// API 服务 - 连接后端真实接口

// 动态获取 API 地址，支持移动端通过局域网访问
const getApiBaseUrl = () => {
  // 优先使用环境变量
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // 根据当前访问的 hostname 动态构建 API 地址
  const host = window.location.hostname;
  return `http://${host}:3001/api`;
};

const API_BASE_URL = getApiBaseUrl();

// 通用请求函数
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // 如果有 token，添加到请求头
  const token = localStorage.getItem('terminal_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }
    
    return data;
  } catch (error) {
    console.error(`API 请求失败 [${endpoint}]:`, error);
    throw error;
  }
}

// ========== 分类 API ==========

export async function getCategories() {
  const res = await request('/categories');
  return res;
}

// ========== 文章 API ==========

// 获取文章列表
export async function getArticles(category = 'all', keyword = '') {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.append('category', category);
  if (keyword) params.append('keyword', keyword);
  
  const queryString = params.toString();
  const res = await request(`/articles${queryString ? `?${queryString}` : ''}`);
  return res.data || [];
}

// 获取单篇文章
export async function getArticle(id) {
  const res = await request(`/articles/${id}`);
  return res.data;
}

// 获取精选文章
export async function getFeaturedArticles() {
  const res = await request('/articles/featured');
  return res.data || [];
}

// 创建/发布文章
export async function saveArticle(article) {
  const res = await request('/articles', {
    method: 'POST',
    body: JSON.stringify(article),
  });
  return res;
}

// 更新文章
export async function updateArticle(id, article) {
  const res = await request(`/articles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(article),
  });
  return res;
}

// 删除文章
export async function deleteArticle(id) {
  const res = await request(`/articles/${id}`, {
    method: 'DELETE',
  });
  return res;
}

// 点赞文章
export async function likeArticle(id) {
  const res = await request(`/articles/${id}/like`, {
    method: 'POST',
  });
  return res;
}

// ========== 评论 API ==========

// 获取文章评论
export async function getComments(articleId) {
  const res = await request(`/articles/${articleId}/comments`);
  return res.data || [];
}

// 添加评论
export async function addComment(articleId, content, author = '游客') {
  const res = await request(`/articles/${articleId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, author }),
  });
  return res.data;
}

// 删除评论
export async function deleteComment(commentId) {
  const res = await request(`/comments/${commentId}`, {
    method: 'DELETE',
  });
  return res;
}

// ========== 草稿 API ==========

// 获取草稿列表
export async function getDrafts() {
  const res = await request('/drafts');
  return res.data || [];
}

// 保存草稿
export async function saveDraft(draft) {
  const res = await request('/drafts', {
    method: 'POST',
    body: JSON.stringify(draft),
  });
  return res;
}

// 导出所有 API 为对象（兼容旧的 api.xxx 调用方式）
export const api = {
  getArticles,
  getArticle,
  getFeaturedArticles,
  saveArticle,
  updateArticle,
  deleteArticle,
  likeArticle,
  getComments,
  addComment,
  deleteComment,
  getDrafts,
  saveDraft,
};

export default api;
