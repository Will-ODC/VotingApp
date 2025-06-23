/**
 * VotingApp - Main Server Application
 * 
 * This is the main entry point for the VotingApp application.
 * It sets up the Express server, configures middleware, and defines routes.
 * 
 * Features:
 * - User authentication and registration
 * - Poll creation and management
 * - Voting functionality
 * - User profiles and admin controls
 */

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');

// Load environment variables from .env file
dotenv.config();

// Import database connection and initialization
const { db, initialize } = require('./models/database');

// Import route modules
const indexRoutes = require('./routes/index');
const pollRoutes = require('./routes/polls');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const apiRoutes = require('./routes/api');

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Configure view engine settings
app.set('view engine', 'ejs');  // Use EJS for templating
app.set('views', path.join(__dirname, 'views'));  // Set views directory
app.use(expressLayouts);  // Enable layout support
app.set('layout', 'layout');  // Set default layout file

// Trust proxy for Railway deployment
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);  // Trust first proxy (Railway's load balancer)
}

// Configure middleware
app.use(express.static(path.join(__dirname, 'public')));  // Serve static files from public directory
app.use(express.urlencoded({ extended: true }));  // Parse URL-encoded bodies
app.use(express.json());  // Parse JSON bodies

// Configure session middleware for user authentication
app.use(require('./middleware/session'));

// Configure flash messages
app.use(flash());

// Add date formatting helper to all views
app.use((req, res, next) => {
    // Helper function to format dates to PST without time
    res.locals.formatDatePST = (dateString) => {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        
        // Options for PST timezone formatting
        const options = {
            timeZone: 'America/Los_Angeles',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        };
        
        return date.toLocaleDateString('en-US', options);
    };
    
    // Make user available to all views
    res.locals.user = req.session.user || null;
    
    next();
});

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'
    });
});

// Define application routes
app.use('/', indexRoutes);  // Home page and general routes
app.use('/polls', pollRoutes);  // Poll creation, viewing, and voting
app.use('/auth', authRoutes);  // Login, registration, and logout
app.use('/profile', profileRoutes);  // User profile management
app.use('/api', apiRoutes);  // API endpoints for AJAX/dynamic content

// Import error handlers
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

// 404 handler - must come after all other routes
app.use(notFoundHandler);

// Global error handler - must be last middleware
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
    try {
        // Initialize database
        await initialize();
        
        // Start the Express server  
        const HOST = '0.0.0.0'; // Always bind to 0.0.0.0 for Railway and Docker compatibility
        app.listen(PORT, HOST, () => {
            console.log(`Server running on http://${HOST}:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT (Ctrl+C). Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM. Shutting down gracefully...');
    process.exit(0);
});

// Start the application
startServer();