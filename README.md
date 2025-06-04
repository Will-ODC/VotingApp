# Online Democratic Community

A web-based voting platform that enables democratic decision-making through community polls and initiatives.

## Features

- **User Authentication**: Secure registration and login system
- **Initiative Creation**: Propose new community decisions with multiple options
- **Democratic Voting**: One vote per user per initiative
- **Real-time Results**: View participation counts and percentages
- **User Profiles**: Track your initiatives and participation history
- **Admin Controls**: Moderation capabilities for community governance

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Templating**: EJS with express-ejs-layouts
- **Authentication**: Express sessions with SHA256 password hashing
- **Styling**: Custom CSS

## Installation

1. Clone the repository
   ```bash
   git clone [your-repo-url]
   cd VotingApp
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables (optional)
   - Copy `.env.example` to `.env` if provided
   - Or create `.env` with:
     ```
     PORT=3000
     ADMIN_USERNAME=admin
     ADMIN_PASSWORD=your_secure_password
     ADMIN_EMAIL=admin@example.com
     SESSION_SECRET=your-secret-key-change-this-in-production
     ```

4. Start the server
   ```bash
   npm start
   ```
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

5. Access the application at `http://localhost:3000`

## Default Admin Account

If no environment variables are set, the default admin account will be:
- **Username**: admin
- **Password**: admin123

⚠️ **Important**: Change the admin password immediately after first login!

## Project Structure

```
VotingApp/
├── server.js           # Main application entry point
├── schema.sql          # Database schema
├── voting.db          # SQLite database (created on first run)
├── .env               # Environment variables (not in git)
├── package.json       # Dependencies and scripts
├── middleware/
│   └── session.js     # Session configuration
├── models/
│   └── database.js    # Database connection and initialization
├── routes/
│   ├── index.js       # Home page routes
│   ├── auth.js        # Authentication routes
│   ├── polls.js       # Poll/initiative management
│   └── profile.js     # User profile routes
├── views/
│   ├── layout.ejs     # Main layout template
│   ├── index.ejs      # Homepage
│   ├── about.ejs      # About page
│   ├── error.ejs      # Error page
│   ├── auth/          # Authentication views
│   ├── polls/         # Poll/initiative views
│   └── profile/       # Profile views
└── public/
    └── css/
        └── style.css  # Application styles
```

## Usage

1. **Register/Login**: Create an account or login with existing credentials
2. **Create Initiative**: Click "Propose Initiative" to create a new community decision
3. **Vote**: Participate in active initiatives (one vote per initiative)
4. **View Results**: See real-time participation counts and percentages
5. **Profile**: Track your created initiatives and voting history

## Deployment

The app is ready for deployment on platforms like:
- Railway (recommended for SQLite support)
- Render
- Fly.io

Set environment variables on your hosting platform for production security.

## Security Notes

- Change default admin credentials immediately
- Use strong session secrets in production
- Consider migrating to PostgreSQL for production deployments
- Enable HTTPS in production environments

## Development

To continue development with this project, navigate to the project directory and start the development server:
```bash
cd VotingApp
npm run dev
```

## License

This project is part of the Online Democratic Community initiative.