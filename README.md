# VotingApp - Democratic Community Decision Platform

A comprehensive web-based voting platform that enables democratic decision-making through community polls and initiatives with advanced features for search, filtering, vote management, and approval workflows.

## 🚀 Features

### 🔐 Authentication & User Management
- **Secure Registration & Login**: Session-based authentication with SHA-256 password hashing
- **User Profiles**: Comprehensive profile pages with voting history and created polls
- **Password Management**: Secure password change functionality
- **Admin System**: Administrative controls with role-based permissions
- **Default Admin Account**: Auto-created admin user for immediate setup

### 📊 Poll Management System
- **Poll Creation**: Create polls with multiple options and configurable settings
- **Expiration Dates**: Set custom end dates or use 30-day default
- **Vote Thresholds**: Set minimum vote requirements for poll approval
- **Automatic Approval**: Polls automatically marked as approved when threshold reached
- **Soft Delete**: Admin can deactivate polls while preserving data
- **Poll Status Tracking**: Active, expired, and deleted poll states

### 🗳️ Advanced Voting System
- **Democratic Voting**: One vote per user per poll
- **Vote Changing**: Users can modify votes until poll expires
- **Vote Validation**: Prevent voting on expired or inactive polls
- **Real-time Results**: Live vote counts with percentage breakdowns
- **Visual Progress**: Progress bars showing votes toward approval thresholds

### 🔍 Search & Discovery
- **Text Search**: Search polls by title and description across all pages
- **Smart Filtering**: Filter polls by status (active/expired/deleted)
- **Intelligent Sorting**: Multiple sort options (popular, recent, most active)
- **Expiry Priority**: Active polls sorted by closest to expiring
- **Advanced Pagination**: Navigate results in groups of 10 with forward/backward controls

### 📱 User Experience
- **Responsive Design**: Mobile-friendly layouts and controls
- **Visual Feedback**: Clear status badges and approval indicators
- **Intuitive Navigation**: Logical page flow with breadcrumb navigation
- **Rich Metadata**: Creator info, vote counts, timestamps, and approval status
- **Performance Optimized**: Pagination prevents overwhelming data loads

### 🎯 Approval & Action System
- **Vote Thresholds**: Set minimum votes needed for poll approval
- **Approval Tracking**: Track when polls become approved for action
- **Visual Progress Bars**: Show progress toward approval thresholds
- **Status Badges**: Clear "APPROVED FOR ACTION" vs "Pending Approval" indicators
- **Future-Ready**: Framework for automated action triggers

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js with comprehensive route handling
- **Database**: PostgreSQL for production, supports both local and cloud databases
- **Templating**: EJS with express-ejs-layouts for modular views
- **Authentication**: Express sessions with SHA-256 password hashing
- **Styling**: Custom CSS with responsive design principles
- **Architecture**: MVC pattern with separation of concerns
- **Code Quality**: Comprehensive JSDoc comments throughout codebase

## Installation

### Option 1: Docker PostgreSQL (Recommended)

1. **Install Docker Desktop** (if not already installed)
   - Download from [docker.com](https://www.docker.com/products/docker-desktop/)

2. **Clone the repository**
   ```bash
   git clone [your-repo-url]
   cd VotingApp
   ```

3. **Start PostgreSQL with Docker**
   ```bash
   # One-time setup (creates and starts PostgreSQL container)
   docker run -d --name votingapp-db \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=votingapp \
     -p 5432:5432 \
     postgres:15
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Set up environment variables** (optional)
   - Copy `.env.example` to `.env` and customize if needed
   - Or create `.env` with:
     ```
     PORT=3000
     DATABASE_URL=postgresql://postgres:postgres@localhost:5432/votingapp
     ADMIN_USERNAME=admin
     ADMIN_PASSWORD=your_secure_password
     ADMIN_EMAIL=admin@example.com
     SESSION_SECRET=your-secret-key-change-this-in-production
     ```

6. **Start the application**
   ```bash
   npm start
   ```
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

7. **Access the application** at `http://localhost:3000`

### Daily Development Workflow
```bash
# Start PostgreSQL (if stopped)
docker start votingapp-db

# Start the application
npm start

# Stop PostgreSQL when done (optional)
docker stop votingapp-db
```

### Option 2: Cloud PostgreSQL (No Docker Required)

1. **Get a free PostgreSQL database** from [Neon](https://neon.tech) or [Supabase](https://supabase.com)

2. **Clone the repository**
   ```bash
   git clone [your-repo-url]
   cd VotingApp
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up environment variables**
   - Create `.env` with your cloud database URL:
     ```
     PORT=3000
     DATABASE_URL=postgresql://your-cloud-database-url
     ADMIN_USERNAME=admin
     ADMIN_PASSWORD=your_secure_password
     ADMIN_EMAIL=admin@example.com
     SESSION_SECRET=your-secret-key-change-this-in-production
     ```

5. **Start the application**
   ```bash
   npm start
   ```

6. **Access the application** at `http://localhost:3000`

## 👤 Default Admin Account

If no environment variables are set, the default admin account will be:
- **Username**: admin
- **Password**: admin123
- **Email**: admin@community.com

⚠️ **Important**: Change the admin password immediately after first login for security!

## Project Structure

```
VotingApp/
├── server.js           # Main application entry point with middleware setup
├── schema.sql          # Database schema with threshold support
├── voting.db          # SQLite database (auto-created on first run)
├── CLAUDE.md          # Comprehensive development documentation
├── README.md          # This file
├── .env               # Environment variables (not in git)
├── package.json       # Dependencies and npm scripts
├── middleware/
│   └── session.js     # Session configuration with security settings
├── models/
│   └── database.js    # Database connection, migrations, and helpers
├── routes/
│   ├── index.js       # Homepage with search and sorting
│   ├── auth.js        # Authentication and user management
│   ├── polls.js       # Poll creation, voting, and threshold checking
│   └── profile.js     # User profiles with pagination
├── views/
│   ├── layout.ejs     # Main layout template
│   ├── index.ejs      # Homepage with search/sort controls
│   ├── about.ejs      # About page
│   ├── error.ejs      # Error page template
│   ├── auth/          # Login and registration views
│   │   ├── login.ejs
│   │   └── register.ejs
│   ├── polls/         # Poll management views
│   │   ├── all.ejs    # All polls with filtering
│   │   ├── create.ejs # Poll creation with threshold
│   │   └── view.ejs   # Individual poll with approval status
│   └── profile/       # User profile views
│       ├── index.ejs  # Profile dashboard with pagination
│       └── change-password.ejs
└── public/
    ├── css/
    │   └── style.css  # Main application styles
    └── js/           # Client-side JavaScript (future use)
```

## 📖 Usage Guide

### For Users
1. **Register/Login**: Create an account or login with existing credentials
2. **Browse Polls**: Use homepage search and sorting to find polls of interest
3. **Create Polls**: Click "Propose Initiative" to create new community decisions
   - Set title, description, and options
   - Optionally set vote thresholds for approval
   - Choose expiration dates
4. **Vote & Change Votes**: Participate in active polls and modify votes until expiration
5. **Track Activity**: Use your profile to see created polls and voting history with pagination

### For Administrators
1. **Poll Management**: View and manage all polls through filtering options
2. **User Oversight**: Monitor community activity and participation
3. **Content Moderation**: Soft-delete inappropriate polls while preserving data
4. **Approval Monitoring**: Track which polls have reached their approval thresholds

### Key Features in Action
- **Search**: Type keywords to find specific polls across titles and descriptions
- **Filter**: Use status filters (Active/Expired/Deleted) to organize poll views
- **Sort**: Choose between Popular (most votes), Recent (newest), or Active (most recent activity)
- **Thresholds**: Set vote requirements for poll approval and track progress visually
- **Real-time Updates**: See live vote counts and approval status changes

## Deployment

The app is ready for deployment on platforms like:
- Railway (recommended for SQLite support)
- Render
- Fly.io

Set environment variables on your hosting platform for production security.

## 🔒 Security Notes

- **Change Default Credentials**: Update admin password immediately after first login
- **Session Security**: Use strong, random session secrets in production
- **Database Migration**: Consider PostgreSQL for large-scale production deployments
- **HTTPS Required**: Enable HTTPS in production environments
- **Password Policies**: Current system uses SHA-256; consider bcrypt for enhanced security
- **SQL Injection Protection**: All queries use parameterized statements
- **XSS Protection**: HTTP-only cookies and proper input sanitization

## 🔧 Development

### Getting Started
```bash
cd VotingApp
npm run dev  # Start with auto-reload
# or
npm start    # Standard start
```

### Key Development Features
- **Automatic Migrations**: Database schema updates automatically on startup
- **Comprehensive Comments**: All code documented with JSDoc-style comments
- **MVC Architecture**: Clean separation of routes, models, and views
- **Error Handling**: Graceful error pages and console logging
- **Development Documentation**: See `CLAUDE.md` for detailed implementation notes

### Development Workflow
1. **Database Changes**: Update `schema.sql` and add migration logic in `models/database.js`
2. **New Features**: Follow MVC pattern with proper route, model, and view separation
3. **Testing**: Verify functionality across authentication states and user roles
4. **Security**: Always use parameterized queries and validate user input

## 📚 Documentation

- **README.md**: This overview and setup guide
- **CLAUDE.md**: Comprehensive technical documentation and feature tracker
- **Code Comments**: JSDoc comments throughout all source files
- **Schema**: Database structure documented in `schema.sql`

## 🎯 Recent Updates

### Latest Session Features
- ✅ **Enhanced Pagination**: Profile voting history now uses proper page navigation (groups of 10)
- ✅ **Vote Threshold System**: Polls can now set approval thresholds with automatic approval tracking
- ✅ **Approval Workflow**: Visual progress bars and status badges for poll approval
- ✅ **Database Migrations**: Automatic schema updates for existing installations
- ✅ **Comprehensive Documentation**: Complete feature tracking and implementation guides

### Previous Enhancements
- ✅ **Search & Filtering**: Text search across polls with smart filtering options
- ✅ **Vote Changing**: Users can modify votes until poll expiration
- ✅ **Smart Sorting**: Popular, recent, and activity-based poll organization
- ✅ **Enhanced Profiles**: Rich metadata and voting history tracking
- ✅ **Responsive Design**: Mobile-friendly interface with visual feedback

## 📄 License

This project is part of the Online Democratic Community initiative. All code is comprehensively documented and follows modern web development best practices.