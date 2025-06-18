-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE,
    name TEXT,
    is_admin BOOLEAN DEFAULT 0,
    verification_token TEXT UNIQUE,
    is_verified BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Polls table
CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closes_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    vote_threshold INTEGER DEFAULT NULL,
    is_approved BOOLEAN DEFAULT 0,
    approved_at TIMESTAMP DEFAULT NULL,
    is_action_initiative BOOLEAN DEFAULT 0,
    action_plan TEXT,
    action_deadline TIMESTAMP,
    action_status TEXT DEFAULT 'pending',
    stage2_deadline TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Options table
CREATE TABLE IF NOT EXISTS options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL,
    option_text TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    is_approved BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poll_id) REFERENCES polls(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    poll_id INTEGER NOT NULL,
    option_id INTEGER NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, poll_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (poll_id) REFERENCES polls(id),
    FOREIGN KEY (option_id) REFERENCES options(id)
);

-- Email list table
CREATE TABLE IF NOT EXISTS email_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stage 2 votes table for action plan approval
CREATE TABLE IF NOT EXISTS stage2_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    poll_id INTEGER NOT NULL,
    approval TEXT NOT NULL CHECK (approval IN ('approve', 'reject')),
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, poll_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (poll_id) REFERENCES polls(id)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_polls_is_action_initiative ON polls(is_action_initiative);
CREATE INDEX IF NOT EXISTS idx_polls_action_status ON polls(action_status);
CREATE INDEX IF NOT EXISTS idx_polls_action_homepage ON polls(is_action_initiative, is_active, closes_at) 
WHERE is_action_initiative = 1;
CREATE INDEX IF NOT EXISTS idx_stage2_votes_poll_id ON stage2_votes(poll_id);