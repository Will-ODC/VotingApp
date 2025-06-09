# VotingApp - Development Documentation

## Project Overview
A Node.js web application for community decision-making through polls and voting. Built with Express.js, SQLite, and EJS templating.

## Architecture
- **Backend**: Node.js with Express.js
- **Database**: SQLite with custom schema
- **Frontend**: EJS templates with embedded CSS
- **Authentication**: Session-based with middleware
- **File Structure**: MVC pattern with routes, models, views, middleware

## ✅ Completed Features

### 🏗️ Core Infrastructure
- [x] **Server Setup** - Express server with proper middleware configuration
- [x] **Database Layer** - SQLite with Promise-based async wrappers
- [x] **Session Management** - Secure session handling with configurable secrets
- [x] **MVC Architecture** - Clean separation of concerns
- [x] **Comprehensive Comments** - All code files fully documented with JSDoc-style comments

### 🔐 Authentication System
- [x] **User Registration** - Account creation with password validation
- [x] **User Login** - Session-based authentication
- [x] **Password Security** - SHA-256 hashing for stored passwords
- [x] **Admin System** - Admin user creation and role management
- [x] **Password Change** - Secure password update functionality
- [x] **Session Security** - HTTP-only cookies, secure in production

### 📊 Poll Management
- [x] **Poll Creation** - Users can create polls with multiple options
- [x] **Poll Expiration** - Configurable end dates for polls
- [x] **Poll Status** - Active, expired, and deleted poll states
- [x] **Soft Delete** - Admin ability to deactivate polls (preserves data)
- [x] **Poll Viewing** - Individual poll pages with results visualization
- [x] **Creator Attribution** - Track who created each poll

### 🗳️ Voting System
- [x] **Vote Submission** - Users can vote on active polls
- [x] **Vote Changing** - Users can modify votes until poll expires
- [x] **Vote Validation** - Prevent voting on expired/deleted polls
- [x] **Vote History** - Track when and what users voted
- [x] **Real-time Results** - Live vote counts and percentages
- [x] **Visual Indicators** - Highlight user's current vote choice

### 🔍 Search & Discovery
- [x] **Text Search** - Search polls by title and description
- [x] **Homepage Search** - Search functionality on main page
- [x] **All Polls Search** - Search across all poll statuses
- [x] **Smart Sorting** - Multiple sort options for different views
- [x] **Filter System** - Filter polls by status (active/expired/deleted)

### 📈 Smart Sorting & Organization
- [x] **Popular by Default** - Homepage shows most voted polls first
- [x] **Expiry Priority** - Active polls sorted by closest to expiring
- [x] **Multiple Sort Options** - Popular, recent, most active
- [x] **Contextual Sorting** - Different defaults for different views

### 👤 User Profiles
- [x] **Profile Dashboard** - Central user information hub
- [x] **Created Polls** - View polls the user has created
- [x] **Voting History** - Comprehensive participation tracking
- [x] **Status Indicators** - Visual badges for poll status (active/expired/deleted)
- [x] **Rich Metadata** - Creator info, vote counts, timestamps
- [x] **Pagination System** - Navigate through voting history in groups of 10

### 🎯 Poll Approval System
- [x] **Vote Thresholds** - Set minimum vote requirements for poll approval
- [x] **Automatic Approval** - Polls automatically marked as approved when threshold reached
- [x] **Approval Tracking** - Track when polls become approved for action
- [x] **Visual Progress** - Progress bars showing votes toward threshold
- [x] **Status Badges** - Clear indicators for approved vs pending polls
- [x] **Database Migration** - Seamless addition of threshold features to existing installations

### 🎨 User Experience
- [x] **Responsive Design** - Mobile-friendly layouts
- [x] **Visual Feedback** - Clear status indicators and badges
- [x] **Intuitive Navigation** - Logical page flow and controls
- [x] **Error Handling** - Graceful error pages and messages
- [x] **Performance** - Pagination prevents overwhelming data loads
- [x] **Proper Pagination** - Navigate voting history in groups of 10 with forward/backward controls

## 🛠️ Technical Implementation Details

### Database Schema
```sql
-- Core tables: users, polls, options, votes
-- New fields in polls table:
--   vote_threshold: Minimum votes needed for approval (nullable)
--   is_approved: Boolean flag indicating if threshold was met
--   approved_at: Timestamp when poll was approved
-- Relationships: polls -> users (creator), votes -> users + options
-- Indexes: Optimized for common queries
-- Migration system: Automatic column addition for existing databases
```

### Security Features
- Password hashing with SHA-256
- Session-based authentication
- SQL injection prevention with parameterized queries
- XSS protection with HTTP-only cookies
- CSRF protection through same-origin policy

### Performance Optimizations
- Database connection pooling
- Efficient SQL queries with JOINs
- Pagination to limit result sets
- Promise-based async operations

## 🔄 Data Flow

### Poll Creation Flow
1. User authentication check
2. Form validation
3. Poll insertion with options
4. Redirect to poll view page

### Voting Flow
1. Authentication and poll validation
2. Check for existing vote
3. Insert new vote OR update existing vote
4. Redirect with updated results

### Search Flow
1. Parse search query and filters
2. Build dynamic SQL with conditions
3. Execute query with proper sorting
4. Render results with pagination

## 📱 User Interface Components

### Navigation
- Header with login/logout
- Contextual action buttons
- Breadcrumb navigation

### Forms
- Poll creation form with dynamic options
- Voting forms with radio buttons
- Search forms with filters

### Data Display
- Poll cards with metadata
- Results visualization with progress bars
- Status badges and indicators
- Pagination controls

## 🔧 Configuration

### Environment Variables
- `PORT` - Server port (default: 3000)
- `SESSION_SECRET` - Session encryption key
- `ADMIN_USERNAME` - Default admin username
- `ADMIN_PASSWORD` - Default admin password
- `ADMIN_EMAIL` - Default admin email
- `NODE_ENV` - Environment (development/production)

### Default Admin Account
- Username: Will
- Password: admin123
- Email: will@community.com
- Role: Administrator

## 📁 Project Structure
```
VotingApp/
├── server.js              # Main application entry point
├── models/
│   └── database.js         # Database connection and helpers
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── index.js           # Homepage routes
│   ├── polls.js           # Poll management routes
│   └── profile.js         # User profile routes
├── middleware/
│   └── session.js         # Session configuration
├── views/
│   ├── layout.ejs         # Main layout template
│   ├── index.ejs          # Homepage
│   ├── auth/              # Login/registration pages
│   ├── polls/             # Poll-related pages
│   └── profile/           # User profile pages
├── public/
│   ├── css/               # Stylesheets
│   └── js/                # Client-side JavaScript
├── schema.sql             # Database schema
├── voting.db              # SQLite database file
└── CLAUDE.md             # This documentation file
```

## 🚀 Future Enhancement Opportunities

### Advanced Features
- [ ] **Email Notifications** - Notify users of poll expiration
- [ ] **Poll Categories** - Organize polls by topic/category
- [ ] **Anonymous Voting** - Option for anonymous polls
- [ ] **Poll Templates** - Reusable poll formats
- [ ] **Bulk Operations** - Admin tools for managing multiple polls
- [ ] **Analytics Dashboard** - Voting statistics and trends
- [ ] **User Avatars** - Profile pictures and customization
- [ ] **Poll Comments** - Discussion on polls
- [ ] **Poll Sharing** - Social media integration
- [ ] **Export Functionality** - Download results as CSV/PDF

### Technical Improvements
- [ ] **API Endpoints** - RESTful API for mobile/external access
- [ ] **Real-time Updates** - WebSocket integration for live results
- [ ] **Database Migration System** - Version-controlled schema updates
- [ ] **Caching Layer** - Redis for improved performance
- [ ] **File Uploads** - Images in polls and profiles
- [ ] **Advanced Search** - Full-text search with rankings
- [ ] **Backup System** - Automated database backups
- [ ] **Monitoring** - Application health and performance metrics

### Security Enhancements
- [ ] **Two-Factor Authentication** - Enhanced account security
- [ ] **Rate Limiting** - Prevent abuse and spam
- [ ] **Advanced Password Policy** - Strength requirements
- [ ] **Audit Logging** - Track all user actions
- [ ] **IP Whitelisting** - Admin access controls

## 🛠️ Development Commands

### Setup
```bash
npm install                 # Install dependencies
node server.js             # Start development server
```

### Database
```bash
# Database is auto-initialized on first run
# Schema file: schema.sql
# Default admin created automatically
```

## 📝 Code Style Guidelines
- Comprehensive JSDoc comments for all functions
- Consistent error handling with try-catch blocks
- Parameterized SQL queries for security
- Responsive CSS with mobile-first approach
- RESTful route naming conventions

## 🐛 Known Issues & Limitations
- Single database file (not suitable for high-scale deployment)
- Basic password hashing (consider bcrypt for production)
- No email verification system
- Limited file upload capabilities
- Basic error logging (consider structured logging)

## 📞 Support & Maintenance
- All routes have comprehensive error handling
- Database operations use promise-based async patterns
- Session management follows security best practices
- Code is fully commented for future maintainers

---

*Last Updated: December 2024*
*Project Status: Active Development*
*Documentation maintained by Claude Code Assistant*