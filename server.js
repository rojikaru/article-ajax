const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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

// WebSocket connection management
const clients = new Map();
const activeEditors = new Map(); // Track who is editing what article

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleWebSocketMessage(ws, data);
    } catch (error) {
      console.error('Invalid WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    // Clean up when client disconnects
    for (const [clientId, client] of clients.entries()) {
      if (client.ws === ws) {
        clients.delete(clientId);
        // Remove from active editors
        for (const [articleId, editors] of activeEditors.entries()) {
          const index = editors.findIndex(e => e.clientId === clientId);
          if (index !== -1) {
            editors.splice(index, 1);
            if (editors.length === 0) {
              activeEditors.delete(articleId);
            } else {
              broadcastEditingStatus(articleId);
            }
          }
        }
        break;
      }
    }
    console.log('WebSocket connection closed');
  });
});

function handleWebSocketMessage(ws, data) {
  const { type, payload } = data;

  switch (type) {
    case 'register':
      registerClient(ws, payload);
      break;
    case 'start_editing':
      handleStartEditing(payload);
      break;
    case 'stop_editing':
      handleStopEditing(payload);
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
  }
}

function registerClient(ws, payload) {
  const clientId = generateClientId();
  clients.set(clientId, {
    ws,
    user: payload.user,
    connectedAt: new Date()
  });
  
  ws.send(JSON.stringify({
    type: 'registered',
    payload: { clientId }
  }));
}

function handleStartEditing(payload) {
  const { clientId, articleId } = payload;
  const client = clients.get(clientId);
  
  if (!client) return;

  if (!activeEditors.has(articleId)) {
    activeEditors.set(articleId, []);
  }
  
  const editors = activeEditors.get(articleId);
  const existingEditor = editors.find(e => e.clientId === clientId);
  
  if (!existingEditor) {
    editors.push({
      clientId,
      username: client.user.username,
      startedAt: new Date()
    });
    broadcastEditingStatus(articleId);
  }
}

function handleStopEditing(payload) {
  const { clientId, articleId } = payload;
  
  if (!activeEditors.has(articleId)) return;
  
  const editors = activeEditors.get(articleId);
  const index = editors.findIndex(e => e.clientId === clientId);
  
  if (index !== -1) {
    editors.splice(index, 1);
    if (editors.length === 0) {
      activeEditors.delete(articleId);
    }
    broadcastEditingStatus(articleId);
  }
}

function broadcastEditingStatus(articleId) {
  const editors = activeEditors.get(articleId) || [];
  const message = {
    type: 'editing_status',
    payload: {
      articleId,
      editors: editors.map(e => ({
        username: e.username,
        startedAt: e.startedAt
      }))
    }
  };

  broadcast(message);
}

function broadcast(message, excludeClientId = null) {
  const messageStr = JSON.stringify(message);
  
  for (const [clientId, client] of clients.entries()) {
    if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  }
}

function notifyArticleUpdate(article, action) {
  const message = {
    type: 'article_update',
    payload: {
      action, // 'created', 'updated', 'approved', 'rejected'
      article
    }
  };
  
  broadcast(message);
}

function notifyModerators(message, data = null) {
  const notification = {
    type: 'moderator_notification',
    payload: {
      message,
      data,
      timestamp: new Date().toISOString()
    }
  };

  for (const [clientId, client] of clients.entries()) {
    if (client.user && client.user.role === 'moderator' && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(notification));
    }
  }
}

function generateClientId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

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

  // Notify about new article creation
  notifyModerators('New article submitted for approval', newArticle);
  notifyArticleUpdate(newArticle, 'created');

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

  // Notify about article update
  if (article.status === 'published') {
    notifyModerators('Article edit submitted for approval', article);
  }
  notifyArticleUpdate(article, 'updated');

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

  // Notify about article approval
  notifyArticleUpdate(article, 'approved');

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

  // Notify about article rejection
  notifyArticleUpdate(article, 'rejected');

  res.json({
    success: true,
    message: 'Article rejected'
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('WebSocket server enabled');
  console.log('Available users:');
  console.log('- admin/admin123 (moderator)');
  console.log('- editor/editor123 (user)');
  console.log('- writer/writer123 (user)');
});
