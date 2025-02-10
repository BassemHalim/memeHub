-- Create Tables
CREATE TABLE IF NOT EXISTS meme (
    id SERIAL PRIMARY KEY,
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
    meme_id INTEGER REFERENCES meme(id),
    tag_id INTEGER REFERENCES tag(id),
    PRIMARY KEY (meme_id, tag_id)
);

-- Create Search Index
DROP INDEX IF EXISTS meme_search_idx;
CREATE INDEX meme_search_idx ON meme USING gin(search_vector);

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
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('arabic', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', 
            (SELECT string_agg(t.name, ' ')
             FROM tag t
             JOIN meme_tag mt ON mt.tag_id = t.id
             WHERE mt.meme_id = NEW.id)
        ), 'B') ||
        setweight(to_tsvector('arabic',
            (SELECT string_agg(t.name, ' ')
             FROM tag t
             JOIN meme_tag mt ON mt.tag_id = t.id
             WHERE mt.meme_id = NEW.id)
        ), 'B');
    RETURN NEW;
END;
$$
 LANGUAGE plpgsql;

CREATE TRIGGER meme_search_vector_update
    BEFORE INSERT OR UPDATE ON meme
    FOR EACH ROW
    EXECUTE FUNCTION update_meme_search_vector();

-- Search Function
CREATE OR REPLACE FUNCTION search_memes(search_query text)
RETURNS TABLE (
    id integer,
    media_url text,
    media_type text,
    name text,
    dimensions integer[],
    rank float4
) AS $$
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
$$

LANGUAGE plpgsql;
