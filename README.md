# VotingApp - Online Democratic Community Platform

A comprehensive web-based voting platform that enables transparent, community-controlled decision-making and ethical data monetization for collective wellbeing. Features include democratic polls, action initiatives, dynamic carousels, and advanced search/filtering capabilities.

## 🚀 Features

### 🔐 Authentication & User Management
- **Secure Registration & Login**: Session-based authentication with SHA-256 password hashing
- **User Profiles**: Comprehensive profile pages with voting history and created polls
- **Password Management**: Secure password change functionality
- **Admin System**: Administrative controls with role-based permissions
- **Default Admin Account**: Auto-created admin user for immediate setup

### 📧 Communication System
- **Simple Contact System**: Direct mailto links for user communication with administrators
- **Integrated Contact Access**: Contact functionality built into main navigation
- **Administrator Communication**: Users can reach platform administrators at info@onlinedemocracy.org

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
- **Inline Voting**: Vote directly from homepage carousel without navigation
- **One-Click Vote Changes**: Instantly change votes with real-time updates
- **Vote Validation**: Prevent voting on expired or inactive polls
- **Real-time Results**: Live vote counts with percentage breakdowns via AJAX
- **Visual Progress**: Progress bars showing votes toward approval thresholds
- **Performance Optimized**: Efficient API endpoints for dynamic updates

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
- **Dynamic Content Loading**: AJAX-powered interfaces for seamless interactions
- **Loading States**: Visual feedback during data operations
- **Error Handling**: Graceful error messages with retry options
- **Z-index Management**: Proper layering of UI elements for optimal experience

### 🎯 Approval & Action System
- **Vote Thresholds**: Set minimum votes needed for poll approval
- **Approval Tracking**: Track when polls become approved for action
- **Visual Progress Bars**: Show progress toward approval thresholds
- **Status Badges**: Clear "APPROVED FOR ACTION" vs "Pending Approval" indicators
- **Future-Ready**: Framework for automated action triggers

### 🚀 Action Initiative System
- **Two-Stage Approval Process**: Community voting (Stage 1) followed by action plan approval (Stage 2)
- **Creator Commitment**: Poll creators commit to taking action when initiatives are approved
- **Action Plan Submission**: Detailed plans with implementation timelines and deadlines
- **Homepage Featuring**: Primary action initiative prominently displayed on homepage
- **Dynamic Carousel Navigation**: Navigate through multiple initiatives with smooth transitions
- **Inline Voting Interface**: Vote directly from carousel without page navigation
- **Real-time Results Display**: View vote counts and percentages without refresh
- **Automatic Status Transitions**: Seamless progression from Stage 1 to Stage 2 voting
- **Stage 2 Voting**: Stage 1 voters can approve or reject proposed action plans
- **Action Deadline Tracking**: Monitor and display action completion deadlines
- **Creator Accountability**: System ensures poll creators follow through on commitments
- **Visual Status Indicators**: Clear badges and progress tracking throughout the process
- **Action Status Management**: Track pending, in-progress, completed, or failed actions
- **Quick Action Creation**: "Create Your Own Initiative" card in carousel for easy access

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
│   ├── layout.ejs     # Main layout template with contact navigation
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
   - Create Action Initiatives with commitment to take action
   - Submit detailed action plans after Stage 1 approval
4. **Vote & Change Votes**: Participate in active polls and modify votes until expiration
5. **Track Activity**: Use your profile to see created polls and voting history with pagination
6. **Contact Administrators**: Use the contact link in navigation to reach administrators at info@onlinedemocracy.org

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
- **Action Initiatives**: Create polls with commitments to take action, submit detailed plans, and track implementation
- **Two-Stage Voting**: Participate in both community approval and action plan approval phases
- **Simple Contact**: Direct email communication with administrators via integrated mailto links

## 🌐 Live Deployment

**The app is now live at: [www.onlinedemocracy.org](https://www.onlinedemocracy.org)**

### Production Deployment Details
- **Platform**: Railway.app with PostgreSQL database
- **Domain**: www.onlinedemocracy.org
- **Status**: ✅ Fully operational with secure authentication and session management

### Deployment Platforms Supported
- Railway (currently deployed - recommended for PostgreSQL)
- Render
- Fly.io
- Heroku

### Required Environment Variables for Deployment
```
DATABASE_URL=your-postgresql-connection-string
NODE_ENV=production
SESSION_SECRET=your-secure-random-string
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-admin-password
ADMIN_EMAIL=your-admin-email
```

## 🔒 Security Notes

- **Change Default Credentials**: Update admin password immediately after first login
- **Session Security**: Use strong, random session secrets in production
- **Database Migration**: Consider PostgreSQL for large-scale production deployments
- **HTTPS Required**: Enable HTTPS in production environments
- **Password Policies**: Current system uses SHA-256; consider bcrypt for enhanced security
- **SQL Injection Protection**: All queries use parameterized statements
- **XSS Protection**: HTTP-only cookies and proper input sanitization
- **Communication Security**: Contact system uses simple mailto links - no complex email server setup required

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
5. **API Development**: Create RESTful endpoints for dynamic features
6. **Frontend Integration**: Use AJAX for seamless user interactions

## 📚 Documentation

- **README.md**: This overview and setup guide
- **Code Comments**: JSDoc comments throughout all source files
- **Schema**: Database structure documented in `schema.sql`
- **API Documentation**: RESTful endpoints documented in route files

## 🎯 Recent Updates

### June 29, 2025 - Dynamic Carousel & Inline Voting
- ✅ **Dynamic Carousel System**: Implemented smooth navigation between action initiatives
- ✅ **Inline Voting Interface**: Vote directly from carousel without page refresh
- ✅ **Real-time Results**: AJAX-powered vote updates with instant feedback
- ✅ **One-Click Vote Changes**: Change votes instantly with optimized API calls
- ✅ **Create Initiative Card**: Quick access to create new initiatives from carousel
- ✅ **Performance Optimization**: Efficient data loading and caching
- ✅ **Enhanced Error Handling**: Graceful fallbacks and user-friendly error messages

### June 19, 2025 - Documentation Update & Contact System
- ✅ **Documentation Updated**: Comprehensive documentation update to reflect current simple contact system
- ✅ **Contact System Documented**: Simple mailto contact system properly documented as completed feature
- ✅ **Contact Integration**: Direct email communication with administrators via info@onlinedemocracy.org
- ✅ **No Complex Setup**: Eliminated references to complex email server configurations

### June 18, 2025 - Action Initiative System Complete
- ✅ **Action Initiative System**: Implemented comprehensive two-stage approval process for community actions
- ✅ **Creator Commitment System**: Poll creators now commit to taking action when initiatives are approved
- ✅ **Two-Stage Approval Workflow**: Stage 1 community voting followed by Stage 2 action plan approval
- ✅ **Homepage Featuring**: Primary action initiative prominently displayed on homepage
- ✅ **Action Plan Management**: Detailed action plans with deadlines and implementation tracking
- ✅ **Automatic Status Transitions**: Seamless progression between voting stages
- ✅ **Creator Accountability**: System tracks action deadlines and completion status

### June 13, 2025 - Production Deployment & Session Fix
- ✅ **Live Deployment**: Successfully deployed to www.onlinedemocracy.org on Railway
- ✅ **Session Persistence Fix**: Resolved production login issues with proxy trust and cookie configuration
- ✅ **Clean Architecture**: Refactored authentication with UserService and UserRepository patterns
- ✅ **PostgreSQL GROUP BY Fix**: Fixed SQL compatibility issues for production database
- ✅ **Production Environment**: Configured with proper environment variables and session storage

### June 11, 2025 - Complete PostgreSQL Migration
- ✅ **Full PostgreSQL Migration**: Complete transition from SQLite to PostgreSQL for production scalability
- ✅ **Railway Deployment Ready**: Fixed host binding, async database initialization, and PostgreSQL syntax
- ✅ **Enhanced User Registration**: Added email field with validation and duplicate email prevention
- ✅ **Production Database Schema**: PostgreSQL-optimized schema with proper constraints and indexes
- ✅ **Local Development with Docker**: Complete Docker setup for PostgreSQL development environment

### Previous Session Features
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
