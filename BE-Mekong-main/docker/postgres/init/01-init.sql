-- Tạo bảng Trạm quan trắc (positions)
CREATE TABLE positions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    distance_km DOUBLE PRECISION,
    type VARCHAR(100)
);

-- Tạo bảng Dữ liệu quan trắc (position_data)
CREATE TABLE position_data (
    id VARCHAR(50) PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    salinity DOUBLE PRECISION,
    water_level DOUBLE PRECISION
);
