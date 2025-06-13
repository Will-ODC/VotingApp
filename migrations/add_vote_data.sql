-- Migration: Add vote_data column to votes table
-- This migration adds support for flexible vote storage for different voting methods

-- Add vote_data JSONB column
ALTER TABLE votes 
ADD COLUMN IF NOT EXISTS vote_data JSONB;

-- For existing votes, populate vote_data with option_id for backward compatibility
UPDATE votes 
SET vote_data = jsonb_build_object('optionId', option_id)
WHERE vote_data IS NULL;

-- Add index for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_votes_vote_data ON votes USING GIN (vote_data);