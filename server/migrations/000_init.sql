CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create Tables
CREATE TABLE IF NOT EXISTS meme (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL,
	name TEXT NOT NULL,
	dimensions INTEGER[] NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	search_vector tsvector
);

CREATE TABLE IF NOT EXISTS tag (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS meme_tag (
    meme_id uuid REFERENCES meme(id),
    tag_id INTEGER REFERENCES tag(id),
    PRIMARY KEY (meme_id, tag_id)
);

-- Create the images table with all required fields
CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    social_media_platform VARCHAR(50) NOT NULL,
    meme_id UUID,
    CONSTRAINT valid_platform CHECK (social_media_platform IN ('FB', 'X', 'Instagram', 'LinkedIn', 'Pinterest', 'Reddit', 'Other')),
    CONSTRAINT fk_reference FOREIGN KEY (meme_id) REFERENCES meme(id) ON DELETE CASCADE
);


-- Add an index on the foreign key for better query performance
CREATE INDEX idx_images_meme_id ON images(meme_id);


-- Create Search Index
DROP INDEX IF EXISTS meme_search_idx;
CREATE INDEX meme_search_idx ON meme USING gin(search_vector);

-- Create Trigram Indexes for fuzzy search
CREATE INDEX IF NOT EXISTS idx_tag_name_trgm ON tag USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_meme_name_trgm ON meme USING GIN (name gin_trgm_ops);

-- Create arabic search configuration
DROP TEXT SEARCH CONFIGURATION IF EXISTS arabic;
CREATE TEXT SEARCH CONFIGURATION public.arabic (COPY = pg_catalog.simple);
CREATE TEXT SEARCH DICTIONARY arabic_hunspell (
    TEMPLATE = ispell,
    DictFile = arabic,
    AffFile = arabic,
    StopWords = arabic
);
ALTER TEXT SEARCH CONFIGURATION arabic 
    ALTER MAPPING FOR asciiword, asciihword, hword_asciipart 
    WITH arabic_hunspell, simple;

-- Function to set or update search_vector
CREATE OR REPLACE FUNCTION update_meme_search_vector() RETURNS trigger AS $$
BEGIN
    UPDATE meme 
    SET search_vector = 
        setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
        setweight(to_tsvector('arabic', COALESCE(name, '')), 'A') ||
        setweight(to_tsvector('english',
            (SELECT string_agg(t.name, ' ')
            FROM tag t
            JOIN meme_tag mt ON mt.tag_id = t.id
            WHERE mt.meme_id = meme.id)
        ), 'B') ||
        setweight(to_tsvector('arabic',
            (SELECT string_agg(t.name, ' ')
            FROM tag t
            JOIN meme_tag mt ON mt.tag_id = t.id
            WHERE mt.meme_id = meme.id)
        ), 'B')
    WHERE id =  NEW.meme_id;
    RETURN NEW;
END;
$$
 LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER meme_search_vector_update
    AFTER INSERT OR UPDATE ON meme_tag
    FOR EACH ROW
    EXECUTE FUNCTION update_meme_search_vector();

-- Search Function

CREATE OR REPLACE FUNCTION public.search_memes(search_query text) RETURNS TABLE(id integer, media_url text, media_type text, name text, dimensions integer[], rank real)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH search_terms AS (
        SELECT 
            websearch_to_tsquery('english', search_query) ||
            websearch_to_tsquery('arabic', search_query) 
            AS query_vector
    )
    SELECT 
        m.id,
        m.media_url,
        m.media_type,
        m.name,
        m.dimensions,
        ts_rank(m.search_vector, st.query_vector) AS rank
    FROM 
        meme m,
        search_terms st
    WHERE 
        m.search_vector @@ st.query_vector
        AND st.query_vector IS NOT NULL
    ORDER BY rank DESC;
END;
$$;


ALTER FUNCTION public.search_memes(search_query text) OWNER TO postgres;


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