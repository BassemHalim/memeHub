-- Migration: Filter approved memes in search function
-- Date: 2025-02-22
-- Description: Updates search_memes_fuzzy function to only return approved memes

-- Drop and recreate the fuzzy meme search function with approval_status filter
DROP FUNCTION IF EXISTS public.search_memes_fuzzy(text);

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
            m.approval_status = 'approved'
            AND m.search_vector @@ (
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
            m.approval_status = 'approved'
            AND similarity(m.name, search_query) > 0.3
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
            m.approval_status = 'approved'
            AND similarity(t.name, search_query) > 0.3
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
-- To rollback this migration, restore the original function without approval_status filter
-- See migration 001_add_fuzzy_search.sql for the original function definition
