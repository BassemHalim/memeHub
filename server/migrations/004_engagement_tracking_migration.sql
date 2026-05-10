-- Migration: Add engagement tracking columns to meme table
-- Date: 2025-12-07
-- Description: Adds download_count and share_count columns with indexes for efficient sorting

-- Add engagement tracking columns
ALTER TABLE meme
ADD COLUMN download_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN share_count INTEGER DEFAULT 0 NOT NULL;

-- Create composite indexes for efficient sorting by engagement metrics
-- These indexes support both sorting and tie-breaking with created_at in a single index scan
CREATE INDEX idx_meme_download_count ON meme(download_count DESC, created_at DESC);
CREATE INDEX idx_meme_share_count ON meme(share_count DESC, created_at DESC);

-- Verify the migration
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'meme' AND column_name IN ('download_count', 'share_count');
