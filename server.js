const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let articles = [
  {
    id: 1,
    title: 'JavaScript Fundamentals',
    content: 'JavaScript is a versatile programming language that powers the web. It enables dynamic content, interactive features, and modern web applications. From simple DOM manipulation to complex frameworks, JavaScript continues to evolve and shape the digital landscape.',
    author: 'John Doe',
    status: 'published',
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date('2024-01-15').toISOString(),
    editedBy: null,
    editContent: null,
    editTitle: null
  },
  {
    id: 2,
    title: 'Modern Web Development',
    content: 'Web development has transformed dramatically over the past decade. Modern tools, frameworks, and methodologies have revolutionized how we build applications. From responsive design to progressive web apps, developers now have powerful tools at their disposal.',
    author: 'Jane Smith',
    status: 'published',
    createdAt: new Date('2024-01-20').toISOString(),
    updatedAt: new Date('2024-01-20').toISOString(),
    editedBy: null,
    editContent: null,
    editTitle: null
  }
];

let users = [
  { id: 1, username: 'admin', role: 'moderator', password: 'admin123' },
  { id: 2, username: 'editor', role: 'user', password: 'editor123' },
  { id: 3, username: 'writer', role: 'user', password: 'writer123' }
];

let currentUser = null;
let nextArticleId = 3;

app.get('/api/articles', (req, res) => {
  const publicArticles = articles
    .filter(article => article.status === 'published')
    .map(article => ({
      id: article.id,
      title: article.title,
      content: article.content,
      author: article.author,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt
    }));
  
  res.json({
    success: true,
    data: publicArticles
  });
});

app.get('/api/articles/pending', (req, res) => {
  if (!currentUser || currentUser.role !== 'moderator') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Moderator rights required.'
    });
  }

  const pendingArticles = articles.filter(article => 
    article.status === 'pending' || 
    (article.editContent !== null && article.status === 'published')
  );

  res.json({
    success: true,
    data: pendingArticles
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    currentUser = { id: user.id, username: user.username, role: user.role };
    res.json({
      success: true,
      data: {
        user: currentUser
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  currentUser = null;
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

app.get('/api/auth/me', (req, res) => {
  if (currentUser) {
    res.json({
      success: true,
      data: { user: currentUser }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
});

app.post('/api/articles', (req, res) => {
  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const { title, content } = req.body;
  
  if (!title || !content || content.length > 2000) {
    return res.status(400).json({
      success: false,
      message: 'Title is required and content must not exceed 2000 characters'
    });
  }

  const newArticle = {
    id: nextArticleId++,
    title,
    content,
    author: currentUser.username,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    editedBy: null,
    editContent: null,
    editTitle: null
  };

  articles.push(newArticle);

  res.status(201).json({
    success: true,
    data: newArticle
  });
});

app.put('/api/articles/:id', (req, res) => {
  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const articleId = parseInt(req.params.id);
  const { title, content } = req.body;
  
  if (!title || !content || content.length > 2000) {
    return res.status(400).json({
      success: false,
      message: 'Title is required and content must not exceed 2000 characters'
    });
  }

  const article = articles.find(a => a.id === articleId);
  
  if (!article) {
    return res.status(404).json({
      success: false,
      message: 'Article not found'
    });
  }

  if (article.status === 'published') {
    article.editTitle = title;
    article.editContent = content;
    article.editedBy = currentUser.username;
  } else {
    article.title = title;
    article.content = content;
  }
  
  article.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: article.status === 'published' 
      ? 'Edit submitted for moderation' 
      : 'Article updated',
    data: article
  });
});

app.post('/api/articles/:id/approve', (req, res) => {
  if (!currentUser || currentUser.role !== 'moderator') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Moderator rights required.'
    });
  }

  const articleId = parseInt(req.params.id);
  const article = articles.find(a => a.id === articleId);
  
  if (!article) {
    return res.status(404).json({
      success: false,
      message: 'Article not found'
    });
  }

  if (article.editContent !== null) {
    article.title = article.editTitle;
    article.content = article.editContent;
    article.editTitle = null;
    article.editContent = null;
    article.editedBy = null;
  }

  article.status = 'published';
  article.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'Article approved',
    data: article
  });
});

app.post('/api/articles/:id/reject', (req, res) => {
  if (!currentUser || currentUser.role !== 'moderator') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Moderator rights required.'
    });
  }

  const articleId = parseInt(req.params.id);
  const article = articles.find(a => a.id === articleId);
  
  if (!article) {
    return res.status(404).json({
      success: false,
      message: 'Article not found'
    });
  }

  if (article.editContent !== null) {
    article.editTitle = null;
    article.editContent = null;
    article.editedBy = null;
  } else {
    article.status = 'rejected';
  }

  article.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'Article rejected'
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Available users:');
  console.log('- admin/admin123 (moderator)');
  console.log('- editor/editor123 (user)');
  console.log('- writer/writer123 (user)');
});
