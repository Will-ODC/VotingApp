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

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Configure view engine settings
app.set('view engine', 'ejs');  // Use EJS for templating
app.set('views', path.join(__dirname, 'views'));  // Set views directory
app.use(expressLayouts);  // Enable layout support
app.set('layout', 'layout');  // Set default layout file

// Configure middleware
app.use(express.static(path.join(__dirname, 'public')));  // Serve static files from public directory
app.use(express.urlencoded({ extended: true }));  // Parse URL-encoded bodies
app.use(express.json());  // Parse JSON bodies

// Configure session middleware for user authentication
app.use(require('./middleware/session'));

// Configure flash messages
app.use(flash());

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

// Start the application
startServer();