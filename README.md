# Article Service

A complete article management system with moderation capabilities, built as a Single Page Application (SPA) using pure JavaScript and AJAX.

## Features

### Public Features
- View all published articles (max 2000 characters each)
- Responsive design that works on desktop and mobile
- Real-time character counting for article content

### Registered User Features
- Create new articles (submitted for moderation)
- Edit existing published articles (edits require moderation approval)
- Login/logout functionality
- Articles are public but editing requires authentication

### Moderator Features
- View articles pending moderation approval
- Approve or reject new articles
- Approve or reject article edits
- Handle concurrent editing scenarios (multiple users editing the same article)

### Technical Features
- Pure JavaScript (no jQuery or external libraries)
- AJAX requests using fetch API
- REST API with JSON data exchange
- ESLint code linting
- Responsive CSS design
- No console errors or logs
- Fast loading (under 4 seconds)
- Cross-browser compatibility (Chrome, Firefox, Safari, Edge)

## Installation

1. **Initialize the project:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Access the application:**
   Open your browser and navigate to `http://localhost:3000`

## Usage

### Default Users
The application comes with pre-configured users:

- **admin** / **admin123** (Moderator) - Can approve/reject articles
- **editor** / **editor123** (User) - Can create and edit articles  
- **writer** / **writer123** (User) - Can create and edit articles

### Workflow

1. **Public Access:** Anyone can view published articles
2. **User Registration:** Use the provided test accounts to login
3. **Article Creation:** Logged-in users can create articles (requires moderation)
4. **Article Editing:** Users can edit published articles (edits require moderation)
5. **Moderation:** Moderators can approve/reject new articles and edits
6. **Concurrent Editing:** System handles multiple users editing the same article

## API Endpoints

The application uses the following REST API endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout  
- `GET /api/auth/me` - Get current user info

### Articles
- `GET /api/articles` - Get all published articles
- `GET /api/articles/pending` - Get articles pending moderation (moderators only)
- `POST /api/articles` - Create new article
- `PUT /api/articles/:id` - Edit existing article
- `POST /api/articles/:id/approve` - Approve article (moderators only)
- `POST /api/articles/:id/reject` - Reject article (moderators only)

## Project Structure

```
article-service/
├── package.json          # Project configuration and dependencies
├── .eslintrc.json       # ESLint configuration
├── server.js            # Express.js backend server
├── README.md            # Project documentation
└── public/
    ├── index.html       # Main HTML file
    ├── styles.css       # CSS styles
    └── app.js           # Frontend JavaScript application
```

## Technical Requirements Compliance

✅ **Pure JS, no jQuery** - Uses vanilla JavaScript and fetch API  
✅ **AJAX calls** - All server communication via fetch API  
✅ **Linter compliance** - ESLint configuration included  
✅ **3+ API endpoints** - 7 REST endpoints implemented  
✅ **NPM project** - Proper package.json with scripts  
✅ **SPA with REST** - Single page application with RESTful backend  
✅ **JSON data exchange** - All API communication in JSON format  
✅ **No console errors** - Clean console output  
✅ **Fast loading** - Optimized for under 4 second load times  
✅ **Multi-browser support** - Compatible with modern browsers  

## Development

### Linting
```bash
npm run lint        # Check code style
npm run lint:fix    # Fix automatically fixable issues
```

### Code Style
- 2-space indentation
- Single quotes for strings
- Semicolons required
- Unix line endings

## Concurrent Editing Handling

The system handles concurrent editing scenarios by:

1. **Separate Edit Storage:** When a published article is edited, changes are stored separately
2. **Edit Pending State:** Original article remains published while edits await approval
3. **Moderation View:** Moderators see both original and proposed changes
4. **Conflict Resolution:** Last edit overwrites previous pending edits
5. **User Notification:** Users are informed when their edits are submitted for moderation

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## License

MIT License
See [LICENSE](LICENSE) for details.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for discussion.
