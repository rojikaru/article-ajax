class ArticleService {
  constructor() {
    this.baseURL = '/api';
    this.currentUser = null;
    this.currentArticle = null;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.checkAuth();
    await this.loadArticles();
  }

  setupEventListeners() {
    const homeBtn = document.getElementById('home-btn');
    const createBtn = document.getElementById('create-btn');
    const moderateBtn = document.getElementById('moderate-btn');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const createForm = document.getElementById('create-form');
    const editForm = document.getElementById('edit-form');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const createContent = document.getElementById('create-content');
    const editContent = document.getElementById('edit-content');

    homeBtn.addEventListener('click', () => this.showView('home'));
    createBtn.addEventListener('click', () => this.showView('create'));
    moderateBtn.addEventListener('click', () => this.showView('moderate'));
    loginBtn.addEventListener('click', () => this.login());
    logoutBtn.addEventListener('click', () => this.logout());
    createForm.addEventListener('submit', (e) => this.handleCreateSubmit(e));
    editForm.addEventListener('submit', (e) => this.handleEditSubmit(e));
    cancelEditBtn.addEventListener('click', () => this.showView('home'));

    createContent.addEventListener('input', () => this.updateCharCount('create'));
    editContent.addEventListener('input', () => this.updateCharCount('edit'));

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.login();
    });
    
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.login();
    });
  }

  async makeRequest(url, options = {}) {
    try {
      this.showLoading(true);
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      };

      const response = await fetch(`${this.baseURL}${url}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      this.showMessage(error.message, 'error');
      throw error;
    } finally {
      this.showLoading(false);
    }
  }

  async checkAuth() {
    try {
      const response = await fetch(`${this.baseURL}/auth/me`);
      if (response.ok) {
        const data = await response.json();
        this.currentUser = data.data.user;
        this.updateAuthUI();
      }
    } catch (error) {
      console.log('Not authenticated');
    }
  }

  async login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
      this.showMessage('Please enter username and password', 'error');
      return;
    }

    try {
      const data = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      this.currentUser = data.data.user;
      this.updateAuthUI();
      this.showMessage('Login successful', 'success');
      
      document.getElementById('username').value = '';
      document.getElementById('password').value = '';
    } catch (error) {
      this.showMessage('Login failed', 'error');
    }
  }

  async logout() {
    try {
      await this.makeRequest('/auth/logout', { method: 'POST' });
      this.currentUser = null;
      this.updateAuthUI();
      this.showView('home');
      this.showMessage('Logged out successfully', 'success');
    } catch (error) {
      this.showMessage('Logout failed', 'error');
    }
  }

  updateAuthUI() {
    const loginSection = document.getElementById('login-section');
    const userSection = document.getElementById('user-section');
    const createBtn = document.getElementById('create-btn');
    const moderateBtn = document.getElementById('moderate-btn');
    const userInfo = document.getElementById('user-info');

    if (this.currentUser) {
      loginSection.style.display = 'none';
      userSection.style.display = 'flex';
      createBtn.style.display = 'block';
      userInfo.textContent = `${this.currentUser.username} (${this.currentUser.role})`;

      if (this.currentUser.role === 'moderator') {
        moderateBtn.style.display = 'block';
      } else {
        moderateBtn.style.display = 'none';
      }
    } else {
      loginSection.style.display = 'flex';
      userSection.style.display = 'none';
      createBtn.style.display = 'none';
      moderateBtn.style.display = 'none';
    }
  }

  async loadArticles() {
    try {
      const data = await this.makeRequest('/articles');
      this.renderArticles(data.data, 'articles-list');
    } catch (error) {
      this.showMessage('Failed to load articles', 'error');
    }
  }

  async loadPendingArticles() {
    if (!this.currentUser || this.currentUser.role !== 'moderator') {
      this.showMessage('Access denied', 'error');
      return;
    }

    try {
      const data = await this.makeRequest('/articles/pending');
      this.renderPendingArticles(data.data);
    } catch (error) {
      this.showMessage('Failed to load pending articles', 'error');
    }
  }

  renderArticles(articles, containerId) {
    const container = document.getElementById(containerId);
    
    if (articles.length === 0) {
      container.innerHTML = '<p class="no-articles">No articles available.</p>';
      return;
    }

    container.innerHTML = articles.map(article => `
      <div class="article-card">
        <h3 class="article-title">${this.escapeHtml(article.title)}</h3>
        <div class="article-meta">
          <span>By: ${this.escapeHtml(article.author)}</span>
          <span>Created: ${this.formatDate(article.createdAt)}</span>
          ${article.updatedAt !== article.createdAt ? 
            `<span>Updated: ${this.formatDate(article.updatedAt)}</span>` : ''
          }
        </div>
        <div class="article-content">${this.escapeHtml(article.content)}</div>
        ${this.currentUser ? `
          <div class="article-actions">
            <button class="btn btn-primary" onclick="app.editArticle(${article.id})">
              Edit
            </button>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  renderPendingArticles(articles) {
    const container = document.getElementById('pending-articles');
    
    if (articles.length === 0) {
      container.innerHTML = '<p class="no-articles">No articles pending moderation.</p>';
      return;
    }

    container.innerHTML = articles.map(article => `
      <div class="article-card">
        <h3 class="article-title">${this.escapeHtml(article.title)}</h3>
        <div class="article-meta">
          <span>By: ${this.escapeHtml(article.author)}</span>
          <span class="status-badge status-${article.status}">${article.status}</span>
          <span>Created: ${this.formatDate(article.createdAt)}</span>
          ${article.updatedAt !== article.createdAt ? 
            `<span>Updated: ${this.formatDate(article.updatedAt)}</span>` : ''
          }
        </div>
        <div class="article-content">${this.escapeHtml(article.content)}</div>
        
        ${article.editContent ? `
          <div class="edit-info">
            <h4>Pending Edit by ${this.escapeHtml(article.editedBy)}:</h4>
            <strong>New Title:</strong> ${this.escapeHtml(article.editTitle)}
            <div class="edit-content">${this.escapeHtml(article.editContent)}</div>
          </div>
        ` : ''}
        
        <div class="article-actions">
          <button class="btn btn-success" onclick="app.approveArticle(${article.id})">
            Approve
          </button>
          <button class="btn btn-danger" onclick="app.rejectArticle(${article.id})">
            Reject
          </button>
        </div>
      </div>
    `).join('');
  }

  async handleCreateSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('create-title').value.trim();
    const content = document.getElementById('create-content').value.trim();

    if (!title || !content) {
      this.showMessage('Title and content are required', 'error');
      return;
    }

    if (content.length > 2000) {
      this.showMessage('Content must not exceed 2000 characters', 'error');
      return;
    }

    try {
      await this.makeRequest('/articles', {
        method: 'POST',
        body: JSON.stringify({ title, content })
      });

      this.showMessage('Article created successfully', 'success');
      document.getElementById('create-form').reset();
      this.updateCharCount('create');
      this.showView('home');
      await this.loadArticles();
    } catch (error) {
      this.showMessage('Failed to create article', 'error');
    }
  }

  async handleEditSubmit(e) {
    e.preventDefault();
    
    if (!this.currentArticle) return;

    const title = document.getElementById('edit-title').value.trim();
    const content = document.getElementById('edit-content').value.trim();

    if (!title || !content) {
      this.showMessage('Title and content are required', 'error');
      return;
    }

    if (content.length > 2000) {
      this.showMessage('Content must not exceed 2000 characters', 'error');
      return;
    }

    try {
      const data = await this.makeRequest(`/articles/${this.currentArticle}`, {
        method: 'PUT',
        body: JSON.stringify({ title, content })
      });

      this.showMessage(data.message, 'success');
      this.showView('home');
      await this.loadArticles();
    } catch (error) {
      this.showMessage('Failed to update article', 'error');
    }
  }

  async editArticle(articleId) {
    if (!this.currentUser) {
      this.showMessage('Please login to edit articles', 'error');
      return;
    }

    try {
      const data = await this.makeRequest('/articles');
      const article = data.data.find(a => a.id === articleId);
      
      if (!article) {
        this.showMessage('Article not found', 'error');
        return;
      }

      this.currentArticle = articleId;
      document.getElementById('edit-title').value = article.title;
      document.getElementById('edit-content').value = article.content;
      this.updateCharCount('edit');
      this.showView('edit');
    } catch (error) {
      this.showMessage('Failed to load article for editing', 'error');
    }
  }

  async approveArticle(articleId) {
    try {
      const data = await this.makeRequest(`/articles/${articleId}/approve`, {
        method: 'POST'
      });

      this.showMessage(data.message, 'success');
      await this.loadPendingArticles();
    } catch (error) {
      this.showMessage('Failed to approve article', 'error');
    }
  }

  async rejectArticle(articleId) {
    try {
      const data = await this.makeRequest(`/articles/${articleId}/reject`, {
        method: 'POST'
      });

      this.showMessage(data.message, 'success');
      await this.loadPendingArticles();
    } catch (error) {
      this.showMessage('Failed to reject article', 'error');
    }
  }

  showView(viewName) {
    const views = document.querySelectorAll('.view');
    const navBtns = document.querySelectorAll('.nav-btn');
    
    views.forEach(view => view.style.display = 'none');
    navBtns.forEach(btn => btn.classList.remove('active'));

    const targetView = document.getElementById(`${viewName}-view`);
    const targetBtn = document.getElementById(`${viewName}-btn`);
    
    if (targetView) {
      targetView.style.display = 'block';
    }
    
    if (targetBtn) {
      targetBtn.classList.add('active');
    }

    if (viewName === 'home') {
      this.loadArticles();
    } else if (viewName === 'moderate') {
      this.loadPendingArticles();
    }
  }

  updateCharCount(formType) {
    const content = document.getElementById(`${formType}-content`).value;
    const counter = document.getElementById(`${formType}-char-count`);
    const count = content.length;
    
    counter.textContent = `${count}/2000`;
    
    if (count > 1800) {
      counter.style.color = '#dc3545';
    } else if (count > 1500) {
      counter.style.color = '#ffc107';
    } else {
      counter.style.color = '#666';
    }
  }

  showMessage(message, type = 'info') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';

    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 4000);
  }

  showLoading(show) {
    const loadingEl = document.getElementById('loading');
    loadingEl.style.display = show ? 'block' : 'none';
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

const app = new ArticleService();
