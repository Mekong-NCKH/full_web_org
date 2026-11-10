-- Optional, reviewed deployment migration. Not executed by application startup.
CREATE INDEX IF NOT EXISTS idx_position_data_station_datetime_id
  ON position_data (station_id, datetime DESC, id);
