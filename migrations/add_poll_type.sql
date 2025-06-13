-- Migration: Add poll_type column to polls table
-- This migration adds support for different voting methods

-- Add poll_type column with default value 'simple'
ALTER TABLE polls 
ADD COLUMN IF NOT EXISTS poll_type TEXT DEFAULT 'simple';

-- Add index for faster queries by poll type
CREATE INDEX IF NOT EXISTS idx_polls_poll_type ON polls(poll_type);

-- Update any NULL values to 'simple' (safety check)
UPDATE polls SET poll_type = 'simple' WHERE poll_type IS NULL;