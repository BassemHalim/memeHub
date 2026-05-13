-- Migration: Add approval columns to meme table
-- Date: 2025-02-22
-- Description: Adds approval status and related fields for the meme approval workflow

-- Add approval system columns to meme table
ALTER TABLE meme 
ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending' NOT NULL,
ADD COLUMN approved_at TIMESTAMP,
ADD COLUMN approved_by VARCHAR(255);

-- Set existing memes to approved
UPDATE meme SET approval_status = 'approved', approved_at = created_at WHERE approval_status = 'pending';

-- Add check constraint
ALTER TABLE meme ADD CONSTRAINT check_approval_status 
CHECK (approval_status IN ('pending', 'approved'));

-- Rollback instructions (commented out):
-- To rollback this migration, run:
-- ALTER TABLE meme DROP CONSTRAINT IF EXISTS check_approval_status;
-- ALTER TABLE meme DROP COLUMN IF EXISTS approved_by;
-- ALTER TABLE meme DROP COLUMN IF EXISTS approved_at;
-- ALTER TABLE meme DROP COLUMN IF EXISTS approval_status;
