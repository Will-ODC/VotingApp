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

// Load environment variables from .env file
dotenv.config();

// Import database connection and initialization
const db = require('./models/database');

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

/**
 * Global error handling middleware
 * Catches any errors that occur during request processing
 * and sends a generic error response to the client
 */
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});