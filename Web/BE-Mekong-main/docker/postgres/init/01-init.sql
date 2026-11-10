-- Public and internal monitoring station metadata.
CREATE TABLE positions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    distance_km DOUBLE PRECISION,
    type VARCHAR(100)
);

-- Timestamped salinity and water-level observations.
CREATE TABLE position_data (
    id VARCHAR(50) PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    salinity DOUBLE PRECISION,
    water_level DOUBLE PRECISION
);

COMMENT ON COLUMN position_data.salinity IS 'Normalized value in mg/L; BaoDinh.csv source S columns are g/L and are multiplied by 1000.';
COMMENT ON COLUMN position_data.water_level IS 'Value in meters relative to the source sea-level reference.';
CREATE INDEX IF NOT EXISTS position_data_station_datetime_idx ON position_data (station_id, datetime);
