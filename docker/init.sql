-- Runs automatically when the container starts for the first time
-- pgvector/pgvector:pg16 image already has the extension available
-- We just need to enable it for our database

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- for fuzzy text search

-- Confirm extensions loaded
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('vector', 'uuid-ossp', 'pg_trgm');
