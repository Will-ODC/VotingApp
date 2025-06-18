-- Migration: Add Action Initiative support to polls table
-- This migration adds support for Action Initiatives with two-stage approval process

-- Add action initiative columns to polls table
ALTER TABLE polls 
ADD COLUMN IF NOT EXISTS is_action_initiative BOOLEAN DEFAULT FALSE;

ALTER TABLE polls 
ADD COLUMN IF NOT EXISTS action_plan TEXT;

ALTER TABLE polls 
ADD COLUMN IF NOT EXISTS action_deadline TIMESTAMP;

ALTER TABLE polls 
ADD COLUMN IF NOT EXISTS action_status TEXT DEFAULT 'pending';

ALTER TABLE polls 
ADD COLUMN IF NOT EXISTS stage2_deadline TIMESTAMP;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_polls_is_action_initiative ON polls(is_action_initiative);
CREATE INDEX IF NOT EXISTS idx_polls_action_status ON polls(action_status);

-- Add composite index for homepage queries (active action initiatives)
CREATE INDEX IF NOT EXISTS idx_polls_action_homepage ON polls(is_action_initiative, is_active, end_date) 
WHERE is_action_initiative = TRUE;

-- Update any existing polls to have proper action_status
UPDATE polls SET action_status = 'pending' WHERE action_status IS NULL;

-- Create Stage 2 votes table for action plan approval
CREATE TABLE IF NOT EXISTS stage2_votes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    poll_id INTEGER NOT NULL,
    approval VARCHAR(10) NOT NULL CHECK (approval IN ('approve', 'reject')),
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, poll_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (poll_id) REFERENCES polls(id)
);

-- Add index for faster Stage 2 vote queries
CREATE INDEX IF NOT EXISTS idx_stage2_votes_poll_id ON stage2_votes(poll_id);

-- Add comments for documentation
COMMENT ON COLUMN polls.is_action_initiative IS 'Boolean flag indicating if this poll is an Action Initiative with creator commitment';
COMMENT ON COLUMN polls.action_plan IS 'Detailed action plan that creator commits to executing';
COMMENT ON COLUMN polls.action_deadline IS 'Deadline by which creator must complete the action';
COMMENT ON COLUMN polls.action_status IS 'Status of action initiative: pending, stage1_approved, stage2_voting, stage2_approved, action_rejected, completed';
COMMENT ON TABLE stage2_votes IS 'Stage 2 votes for action plan approval (approve/reject)';