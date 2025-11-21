-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create family groups table
CREATE TABLE IF NOT EXISTS family_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    invite_code VARCHAR(50) UNIQUE NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create family members junction table
CREATE TABLE IF NOT EXISTS family_members (
    id SERIAL PRIMARY KEY,
    family_id INTEGER REFERENCES family_groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_visible BOOLEAN DEFAULT TRUE,
    UNIQUE(family_id, user_id)
);

-- Create locations table with PostGIS geometry
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    position GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on locations for spatial queries
CREATE INDEX idx_locations_position ON locations USING GIST(position);
CREATE INDEX idx_locations_user_time ON locations(user_id, timestamp DESC);
CREATE INDEX idx_locations_timestamp ON locations(timestamp);

-- Create road segments table (for speed limits)
CREATE TABLE IF NOT EXISTS road_segments (
    id SERIAL PRIMARY KEY,
    osm_id BIGINT,
    name VARCHAR(255),
    road_type VARCHAR(50),
    speed_limit INTEGER,
    speed_limit_unit VARCHAR(10) DEFAULT 'mph',
    geometry GEOGRAPHY(LINESTRING, 4326) NOT NULL,
    bbox_min_lat DOUBLE PRECISION,
    bbox_min_lon DOUBLE PRECISION,
    bbox_max_lat DOUBLE PRECISION,
    bbox_max_lon DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index on road segments
CREATE INDEX idx_road_segments_geometry ON road_segments USING GIST(geometry);
CREATE INDEX idx_road_segments_bbox ON road_segments(bbox_min_lat, bbox_min_lon, bbox_max_lat, bbox_max_lon);

-- Create speed limit lookups table (cache)
CREATE TABLE IF NOT EXISTS speed_limit_cache (
    id SERIAL PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    road_segment_id INTEGER REFERENCES road_segments(id) ON DELETE CASCADE,
    speed_limit INTEGER,
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

CREATE INDEX idx_speed_cache_coords ON speed_limit_cache(latitude, longitude);
CREATE INDEX idx_speed_cache_expires ON speed_limit_cache(expires_at);

-- Function to find nearest road segment
CREATE OR REPLACE FUNCTION find_nearest_road(
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 20
)
RETURNS TABLE(
    segment_id INTEGER,
    road_name VARCHAR,
    speed_limit INTEGER,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rs.id,
        rs.name,
        rs.speed_limit,
        ST_Distance(
            rs.geometry::geography,
            ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
        ) as distance
    FROM road_segments rs
    WHERE ST_DWithin(
        rs.geometry::geography,
        ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
        radius_meters
    )
    ORDER BY distance
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old location data (30 days)
CREATE OR REPLACE FUNCTION cleanup_old_locations()
RETURNS void AS $$
BEGIN
    DELETE FROM locations 
    WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    DELETE FROM speed_limit_cache
    WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX idx_family_members_user ON family_members(user_id);
CREATE INDEX idx_family_members_family ON family_members(family_id);

-- Insert test data (optional, for development)
-- Uncomment to add test user and family
/*
INSERT INTO users (email, password_hash, name) VALUES
('test@example.com', '$2b$10$test_hash', 'Test User');

INSERT INTO family_groups (name, invite_code, created_by) VALUES
('Test Family', 'TEST123', 1);

INSERT INTO family_members (family_id, user_id, role) VALUES
(1, 1, 'admin');
*/

COMMENT ON TABLE locations IS 'Stores user location history with PostGIS support';
COMMENT ON TABLE road_segments IS 'OpenStreetMap road data with speed limits';
COMMENT ON FUNCTION find_nearest_road IS 'Finds nearest road segment within radius and returns speed limit';
