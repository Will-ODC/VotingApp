/**
 * Session Middleware Configuration
 * 
 * This module configures express-session middleware for managing user sessions.
 * Sessions are used to maintain user authentication state across requests.
 */

const session = require('express-session');
const crypto = require('crypto');
const pgSession = require('connect-pg-simple')(session);

/**
 * Configure session middleware with security best practices
 * 
 * Configuration options:
 * - secret: Session secret key (from env or randomly generated)
 * - resave: Don't save session if unmodified (false)
 * - saveUninitialized: Don't create session until something stored (false)
 * - cookie: Session cookie configuration
 *   - secure: Use secure cookies in production (HTTPS only)
 *   - httpOnly: Prevent client-side JS access (XSS protection)
 *   - maxAge: Session expires after 24 hours
 */
// Debug session store connection
console.log('🗃️ SESSION STORE CONFIG:');
console.log('📊 DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('🔐 SESSION_SECRET exists:', !!process.env.SESSION_SECRET);
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);

const sessionStore = new pgSession({
    conString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/votingapp',
    tableName: 'session',  // Session table name
    createTableIfMissing: true  // Auto-create session table
});

// Debug session store events
sessionStore.on('connect', () => {
    console.log('✅ Session store connected to PostgreSQL');
});

sessionStore.on('disconnect', () => {
    console.log('❌ Session store disconnected from PostgreSQL');
});

const sessionMiddleware = session({
    // PostgreSQL session store
    store: sessionStore,
    // Use environment variable or generate random secret
    secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
    resave: false,  // Don't save session if it wasn't modified
    saveUninitialized: false,  // Don't create session until data is stored
    cookie: {
        secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
        httpOnly: true,  // Prevent XSS attacks by disabling client-side access
        maxAge: 24 * 60 * 60 * 1000,  // Session expires after 24 hours
        sameSite: 'lax',  // Allow cookies to be sent with navigations
        domain: process.env.COOKIE_DOMAIN || undefined,  // Set if needed for subdomain sharing
        path: '/'  // Explicitly set path
    }
});

// Export configured session middleware
module.exports = sessionMiddleware;