-- Migration: Add fuzzy search functions for Arabic search improvement
-- Date: 2025-12-15
-- Description: Adds trigram-based fuzzy search functions for tags and memes

-- Enable pg_trgm extension for trigram-based similarity matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram index on tag.name for fuzzy tag search and autocomplete
-- This index enables fast similarity searches like: similarity(name, 'search_term') > 0.3
CREATE INDEX IF NOT EXISTS idx_tag_name_trgm ON tag USING GIN (name gin_trgm_ops);

-- Create trigram index on meme.name for fuzzy meme name search
-- This index enables fast similarity searches on meme names
CREATE INDEX IF NOT EXISTS idx_meme_name_trgm ON meme USING GIN (name gin_trgm_ops);

-- Fuzzy tag search function using trigram similarity
CREATE OR REPLACE FUNCTION public.search_tags_fuzzy(
    search_query text,
    similarity_threshold real DEFAULT 0.3,
    result_limit integer DEFAULT 10
) RETURNS TABLE(name text, similarity real)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.name,
        similarity(t.name, search_query) AS sim
    FROM 
        tag t
    WHERE 
        similarity(t.name, search_query) > similarity_threshold
    ORDER BY 
        sim DESC,
        t.name ASC
    LIMIT result_limit;
END;
$$;

ALTER FUNCTION public.search_tags_fuzzy(text, real, integer) OWNER TO postgres;

-- Fuzzy meme search function combining full-text search and trigram similarity
CREATE OR REPLACE FUNCTION public.search_memes_fuzzy(search_query text) 
RETURNS TABLE(id uuid, media_url text, media_type text, name text, dimensions integer[], rank double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH 
    -- Full-text search results
    fts_results AS (
        SELECT 
            m.id,
            m.media_url,
            m.media_type,
            m.name,
            m.dimensions,
            ts_rank(m.search_vector, 
                websearch_to_tsquery('english', search_query) ||
                websearch_to_tsquery('arabic', search_query)
            ) AS fts_rank,
            0.0::double precision AS trgm_rank
        FROM 
            meme m
        WHERE 
            m.search_vector @@ (
                websearch_to_tsquery('english', search_query) ||
                websearch_to_tsquery('arabic', search_query)
            )
    ),
    -- Trigram similarity search on meme names
    trgm_meme_results AS (
        SELECT 
            m.id,
            m.media_url,
            m.media_type,
            m.name,
            m.dimensions,
            0.0::double precision AS fts_rank,
            similarity(m.name, search_query)::double precision AS trgm_rank
        FROM 
            meme m
        WHERE 
            similarity(m.name, search_query) > 0.3
    ),
    -- Trigram similarity search on tag names
    trgm_tag_results AS (
        SELECT DISTINCT
            m.id,
            m.media_url,
            m.media_type,
            m.name,
            m.dimensions,
            0.0::double precision AS fts_rank,
            MAX(similarity(t.name, search_query))::double precision AS trgm_rank
        FROM 
            meme m
            JOIN meme_tag mt ON m.id = mt.meme_id
            JOIN tag t ON mt.tag_id = t.id
        WHERE 
            similarity(t.name, search_query) > 0.3
        GROUP BY m.id, m.media_url, m.media_type, m.name, m.dimensions
    ),
    -- Combine all results
    combined_results AS (
        SELECT * FROM fts_results
        UNION ALL
        SELECT * FROM trgm_meme_results
        UNION ALL
        SELECT * FROM trgm_tag_results
    )
    -- Deduplicate and rank
    SELECT 
        cr.id,
        cr.media_url,
        cr.media_type,
        cr.name,
        cr.dimensions,
        -- Prioritize FTS results over trigram results
        (MAX(cr.fts_rank) * 2.0 + MAX(cr.trgm_rank)) AS rank
    FROM 
        combined_results cr
    GROUP BY 
        cr.id, cr.media_url, cr.media_type, cr.name, cr.dimensions
    ORDER BY 
        rank DESC;
END;
$$;

ALTER FUNCTION public.search_memes_fuzzy(text) OWNER TO postgres;

-- Rollback instructions (commented out):
-- To rollback this migration, run:
-- DROP FUNCTION IF EXISTS public.search_tags_fuzzy(text, real, integer);
-- DROP FUNCTION IF EXISTS public.search_memes_fuzzy(text);
