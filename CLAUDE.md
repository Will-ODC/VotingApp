# VotingApp - Development Documentation

## Project Overview
An Online Democratic Community (ODC) platform that enables transparent, community-controlled decision-making and ethical data monetization for collective wellbeing. Built as a Node.js web application using Express.js, SQLite, and EJS templating.

### ODC Vision
- **Core Mission**: Create a democratic platform where users control how their data is used and monetized, with all proceeds funding community-chosen wellbeing initiatives
- **Funding Model**: Hybrid approach combining Wikipedia-style donations with voluntary corporate data partnerships (where users explicitly opt-in to share feedback)
- **Target Community**: Initial focus on 1,000 committed users in specific niches (e.g., privacy advocates, local governance, sustainable living)
- **Key Differentiator**: Not another social media platform, but a community research cooperative that uses democratic technology for collective benefit

## Architecture
- **Backend**: Node.js with Express.js
- **Database**: SQLite with custom schema
- **Frontend**: EJS templates with embedded CSS
- **Authentication**: Session-based with middleware
- **File Structure**: MVC pattern with routes, models, views, middleware

## 🎯 ODC Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
Focus on core infrastructure for community understanding and organization.

- [x] **About Page** (1 day) - Simple explanation of ODC concepts, vision, and how the platform works
- [x] **Poll Categories/Tags** (2 days) - Organize polls by type (budget allocation, community rules, partnerships, wellbeing initiatives)
- [ ] **Deploy MVP to Production** (3-5 days) - Deploy basic but functional ODC for community testing and feedback
- [ ] **User Contribution & Initiative Tracking** (3-4 days) - Track polls created, votes cast, donations, and initiative completions with blog-style posts and community verification

### Phase 2: Trust & Transparency (Weeks 5-8)
Build community trust through transparency and user guidance.

- [ ] **Enhanced Profile Pages** (3 days) - Display contribution stats, initiative completion blog posts, and verification badges
- [ ] **Community Fund Display** (3 days) - Show total funds, recent donations, and pending allocations
- [ ] **Basic Weighted Voting Display** (3 days) - Show future voting weights based on contributions (UI only, no logic yet)
- [ ] **First-Time User Tutorial** (5 days) - Interactive guide highlighting key features and democratic process

### Phase 3: Community Engagement (Weeks 9-12)
Enable deeper participation and discussion.

- [ ] **User-Submitted Poll Options** (3 days) - Allow community members to add options to existing polls
- [ ] **Poll Discussion Comments** (1 week) - Basic commenting system for deliberation before voting
- [ ] **Email Notifications** (1 week) - Notify users of expiring polls and community updates
- [ ] **Vote Notification Preferences** (4 days) - After voting, popup offers: notify when poll closes, monthly summary of voted polls, or no notifications
- [ ] **Initiative Verification Feed** (2 days) - Community feed showing pending initiative completions needing verification

### Phase 4: Advanced Governance (Months 4-6)
Implement sophisticated democratic features.

- [ ] **Trust Rating System** (2 weeks) - Verified tags (student, employee, expert) with authentication
- [ ] **Weighted Voting Logic** (2 weeks) - Implement actual contribution-based voting weights
- [ ] **Multiple Voting Methods** (2 weeks) - Add ranked choice and approval voting options

### Phase 5: Advanced Engagement (Months 6+)
Advanced features for community insights and rapid participation.

- [ ] **Quick-Vote Carousel View** (2 weeks) - Single-poll view allowing rapid scrolling and voting through related initiatives
- [ ] **Initiative Sets/Collections** (3 weeks) - Create grouped polls for comprehensive decision-making on complex topics
- [ ] **3-Perspective Discussion Algorithm** (3 weeks) - Show popular opinions that agree/disagree with user, plus expert views
- [ ] **Community Insights Dashboard** (2 weeks) - Aggregate trends and wellbeing metrics
- [ ] **Data Partnership Framework** (1 month) - Secure system for voluntary data sharing with ethical partners

## 📊 Strategic Roadmap & Success Metrics

### Phase-Based Success Metrics
- **Phase 1 (MVP):** 50 active users, 10 organic polls, Weekly Active Users (WAU) tracking
- **Phase 2 (Trust):** $1,000 community fund, 75% 30-day retention, 100 active users
- **Phase 3 (Engagement):** 500 users, 3 votes/user/week average, 50+ comments per poll
- **Phase 4 (Governance):** 1,000 verified users, First $5,000+ allocation, Successful weighted voting

### Go/No-Go Decision Points
- **After Phase 1:** Minimum 25 committed core users before proceeding
- **After Phase 2:** Evidence of organic community activity (self-created polls)
- **After Phase 3:** >50% weekly participation rate
- **After Phase 4:** Governance model functioning without major conflicts

## 🌱 Community Growth Strategy

### Target Communities (Start with ONE)
1. **Privacy-Conscious Tech Workers** (Recommended)
   - Understand data ownership value
   - Have disposable income
   - Natural evangelists
   
2. **Local Governance Enthusiasts**
   - Passionate about democratic process
   - Experience with current system limitations
   
3. **Sustainable Living Communities**
   - Values-aligned with collective wellbeing
   - Action-oriented mindset

### Growth Phases
- **Phase 0: Founders Circle (0-25 users)** - Personal outreach, weekly calls, founding benefits
- **Phase 1: Core Community (25-100)** - Referral system, first wins, origin story
- **Phase 2: Organic Growth (100-500)** - Content strategy, aligned partnerships, demonstrate impact
- **Phase 3: Scaled Community (500-1,000)** - Geographic expansion, sub-communities, ambassadors

### Engagement Mechanisms
- **Weekly Rituals:** "Decision Day" Mondays, "Impact Report" Fridays
- **Simple Gamification:** Participation streaks, voting badges, founder recognition
- **Real Impact:** Monthly success stories, transparency reports, direct feedback loops

### Quick Wins for Momentum
- **Week 1:** Vote on platform name/branding
- **Week 2:** First user completes and documents an initiative with blog post
- **Month 1:** Allocate $100 to community-chosen charity
- **Month 2:** 10 verified initiative completions showing real impact
- **Quarter 1:** Implement user-voted platform feature
- **Year 1:** Demonstrate measurable wellbeing improvement

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

-- User Contribution Tracking tables:
-- contributions: Tracks all user contributions (polls, votes, donations, initiatives)
-- user_stats: Denormalized stats for fast profile loading
-- initiative_posts: Blog-style posts documenting completed initiatives
-- post_verifications: Community verifications of initiative completions
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

### Initiative Completion Flow
1. User completes approved poll action
2. Creates blog-style post with evidence (photos, links, description)
3. Community members verify completion (witnessed, participated, confirmed)
4. After threshold verifications, contribution points awarded
5. Initiative success displayed on profile and community impact page

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
- Username: admin
- Password: admin123
- Email: admin@community.com
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

### ODC-Specific Features
- [ ] **Federated ODC Network** - Allow communities to create interconnected ODC instances
- [ ] **Wellbeing Metrics Tracking** - Measure and display community health indicators
- [ ] **Ethical Data Marketplace** - Platform for transparent data partnerships with values-aligned organizations
- [ ] **Democratic Budget Allocation** - Liquid democracy for fund distribution
- [ ] **Impact Reporting** - Automated reports showing how community funds improved wellbeing
- [ ] **Anonymous Voting Options** - For sensitive community decisions
- [ ] **Reputation Decay System** - Ensure active participation for voting weight
- [ ] **Community Constitution** - Votable foundational rules and amendment process

### Advanced Participation Features
- [ ] **Dynamic Poll Options** - Users can add new options to existing polls with community approval
- [ ] **Rapid Engagement Interface** - Swipe-style quick voting for bulk participation in related polls
- [ ] **Initiative Collections** - Bundle related polls into comprehensive decision packages
- [ ] **Cross-Initiative Analytics** - Track voting patterns across poll sets and categories

### Advanced Democratic Features
- [ ] **Quadratic Voting** - Prevent wealth-based dominance in decisions
- [ ] **Delegation System** - Allow users to delegate votes to trusted representatives
- [ ] **Proposal Templates** - Structured formats for different types of initiatives
- [ ] **Consensus Building Tools** - Features to find common ground before voting
- [ ] **Exit Rights** - Users can leave with their data and proportional fund share

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

## 🚧 Current Development Status (June 2025)

### ✅ Completed Phase 1 Tasks
- [x] **PostgreSQL Support Added** - Dual database system (SQLite local, PostgreSQL production)
- [x] **Railway Deployment Configuration** - Complete deployment setup with health checks
- [x] **Environment Variables** - Comprehensive .env.example with all required variables
- [x] **Custom Domain Setup** - DNS configured for www.onlinedemocracy.org

### 🔄 Current Issues Being Resolved

#### Railway Deployment Status
- **Service Status:** Active with successful deployments
- **Database:** PostgreSQL service running and connected
- **Issue:** "Unexposed service" warning preventing public access
- **URLs Tested:**
  - `votingapp-production-2fde.up.railway.app` - Not accessible
  - `www.onlinedemocracy.org` - Application failed to respond
- **Environment Variables Set:** SESSION_SECRET, NODE_ENV=production, ADMIN_* variables, DATABASE_URL

#### Local Development Status
- **Database:** Successfully using SQLite locally
- **Issue:** Server startup conflicts and connection timeouts
- **Last Working:** Server starts on port 3001 but connection timeouts occur
- **Recent Changes:** Modified server.js to bind to localhost in development, 0.0.0.0 in production

### 🔧 Technical Configuration Completed
- **Host Binding:** Dynamic (localhost for dev, 0.0.0.0 for production)
- **Port Configuration:** Dynamic via process.env.PORT (Railway) or 3000 (local)
- **Database Switching:** Automatic based on DATABASE_URL presence
- **Health Check Endpoint:** /health endpoint implemented for Railway monitoring

### 📋 Next Steps for Resolution
1. **Railway Networking:** Resolve "unexposed service" issue to activate public URLs
2. **Local Development:** Debug connection timeout issues with SQLite database
3. **Domain Verification:** Complete DNS propagation and Railway domain activation
4. **Testing:** Verify both local development and production deployment work

### 🎯 Pending Implementation (After Deployment Issues Resolved)
- User Contribution Tracking database tables
- Initiative completion blog post system with community verification
- Enhanced profile pages with contribution stats
- Security improvements (bcrypt password hashing)

### 🗄️ Database Schema Status
- **Production:** PostgreSQL with all tables and migrations working
- **Development:** SQLite with same schema, automatic admin user creation
- **Admin Credentials:** username=admin, password=Krebs@5902 (production)

### 🌐 Domain Configuration
- **Cloudflare DNS:** CNAME www → wrle7373.up.railway.app (DNS only, gray cloud)
- **Railway Custom Domain:** www.onlinedemocracy.org (shows green checkmark but not routing)
- **Railway Generated Domain:** Grey globe indicating inactive status

---

*Last Updated: June 11, 2025*
*Project Status: Deployment Troubleshooting Phase*
*Documentation maintained by Claude Code Assistant*