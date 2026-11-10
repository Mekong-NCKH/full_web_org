-- Additive Phase 2 schema for source provenance and model-derived outputs.
-- Safe to run once against an existing Phase 1 database or during local init.
BEGIN;

CREATE TABLE IF NOT EXISTS data_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_code TEXT NOT NULL,
    source_filename TEXT NOT NULL,
    source_file_sha256 CHAR(64) NOT NULL
        CHECK (source_file_sha256 ~ '^[a-f0-9]{64}$'),
    source_timezone TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    source_salinity_unit TEXT NOT NULL,
    normalized_salinity_unit TEXT NOT NULL,
    water_level_unit TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'registered'
        CHECK (status IN ('registered', 'loaded')),
    loaded_record_count INTEGER NOT NULL DEFAULT 0
        CHECK (loaded_record_count >= 0),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_loaded_at TIMESTAMPTZ,
    CONSTRAINT data_imports_window_ordered CHECK (window_start <= window_end),
    CONSTRAINT data_imports_source_checksum_unique
        UNIQUE (source_code, source_file_sha256)
);

COMMENT ON TABLE data_imports IS
    'Immutable source-file identity and import metadata used to trace normalized observations back to their source.';

CREATE TABLE IF NOT EXISTS raw_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES data_imports(id) ON DELETE RESTRICT,
    station_id VARCHAR(50) NOT NULL REFERENCES positions(id) ON DELETE RESTRICT,
    observed_at TIMESTAMPTZ NOT NULL,
    source_row_number INTEGER NOT NULL CHECK (source_row_number > 0),
    raw_salinity_value TEXT NOT NULL,
    raw_water_level_value TEXT NOT NULL,
    salinity_g_per_l DOUBLE PRECISION,
    water_level_m DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT raw_observations_import_station_time_unique
        UNIQUE (import_id, station_id, observed_at)
);

COMMENT ON TABLE raw_observations IS
    'Parsed source values plus their original CSV field text. Blank, zero, and negative values remain distinguishable.';
COMMENT ON COLUMN raw_observations.salinity_g_per_l IS
    'Parsed source salinity in g/L; NULL means the source field was blank.';
COMMENT ON COLUMN raw_observations.water_level_m IS
    'Parsed source water level in meters; NULL means the source field was blank.';

ALTER TABLE position_data
    ADD COLUMN IF NOT EXISTS source_import_id UUID
        REFERENCES data_imports(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS quality_status TEXT NOT NULL DEFAULT 'unverified'
        CHECK (quality_status IN ('unverified', 'validated', 'suspect'));

COMMENT ON COLUMN position_data.source_import_id IS
    'Source import that last populated this normalized observation; NULL for legacy rows without source-level provenance.';
COMMENT ON COLUMN position_data.quality_status IS
    'Measurement quality state. Source provenance does not by itself mark a field observation as validated.';

CREATE INDEX IF NOT EXISTS raw_observations_station_time_idx
    ON raw_observations (station_id, observed_at);
CREATE INDEX IF NOT EXISTS raw_observations_import_idx
    ON raw_observations (import_id);
CREATE INDEX IF NOT EXISTS position_data_source_import_idx
    ON position_data (source_import_id)
    WHERE source_import_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT NOT NULL,
    task TEXT NOT NULL CHECK (task IN ('forecast', 'imputation')),
    version TEXT NOT NULL,
    framework TEXT,
    artifact_sha256 CHAR(64)
        CHECK (artifact_sha256 IS NULL OR artifact_sha256 ~ '^[a-f0-9]{64}$'),
    code_commit TEXT,
    training_import_id UUID REFERENCES data_imports(id) ON DELETE SET NULL,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_status TEXT NOT NULL DEFAULT 'experimental'
        CHECK (validation_status IN ('experimental', 'validated', 'retired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT model_versions_name_task_version_unique
        UNIQUE (model_name, task, version)
);

CREATE TABLE IF NOT EXISTS forecast_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE RESTRICT,
    station_id VARCHAR(50) NOT NULL REFERENCES positions(id) ON DELETE RESTRICT,
    target_variable TEXT NOT NULL CHECK (target_variable IN ('salinity', 'water_level')),
    target_unit TEXT NOT NULL CHECK (target_unit IN ('mg/L', 'm')),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_cutoff_at TIMESTAMPTZ NOT NULL,
    horizon_start TIMESTAMPTZ NOT NULL,
    horizon_end TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_summary TEXT,
    CONSTRAINT forecast_runs_horizon_ordered CHECK (horizon_start <= horizon_end)
);

CREATE TABLE IF NOT EXISTS forecast_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES forecast_runs(id) ON DELETE CASCADE,
    target_time TIMESTAMPTZ NOT NULL,
    predicted_value DOUBLE PRECISION NOT NULL,
    lower_bound DOUBLE PRECISION,
    upper_bound DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT forecast_results_bounds_ordered
        CHECK (lower_bound IS NULL OR upper_bound IS NULL OR lower_bound <= upper_bound),
    CONSTRAINT forecast_results_run_time_unique UNIQUE (run_id, target_time)
);

CREATE INDEX IF NOT EXISTS forecast_runs_station_issued_idx
    ON forecast_runs (station_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS forecast_results_run_time_idx
    ON forecast_results (run_id, target_time);

CREATE TABLE IF NOT EXISTS imputation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE RESTRICT,
    station_id VARCHAR(50) NOT NULL REFERENCES positions(id) ON DELETE RESTRICT,
    target_variable TEXT NOT NULL CHECK (target_variable IN ('salinity', 'water_level')),
    target_unit TEXT NOT NULL CHECK (target_unit IN ('mg/L', 'm')),
    range_start TIMESTAMPTZ NOT NULL,
    range_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_summary TEXT,
    CONSTRAINT imputation_runs_range_ordered CHECK (range_start <= range_end)
);

CREATE TABLE IF NOT EXISTS imputation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES imputation_runs(id) ON DELETE CASCADE,
    target_observation_id VARCHAR(50) NOT NULL
        REFERENCES position_data(id) ON DELETE CASCADE,
    imputed_value DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT imputation_results_run_observation_unique
        UNIQUE (run_id, target_observation_id)
);

CREATE INDEX IF NOT EXISTS imputation_runs_station_created_idx
    ON imputation_runs (station_id, created_at DESC);

CREATE TABLE IF NOT EXISTS monitoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id VARCHAR(50) NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    target_variable TEXT NOT NULL CHECK (target_variable IN ('salinity', 'water_level')),
    comparison TEXT NOT NULL
        CHECK (comparison IN ('gt', 'gte', 'lt', 'lte', 'outside_range')),
    target_unit TEXT NOT NULL CHECK (target_unit IN ('mg/L', 'm')),
    threshold_value DOUBLE PRECISION,
    lower_bound DOUBLE PRECISION,
    upper_bound DOUBLE PRECISION,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT monitoring_rules_threshold_shape CHECK (
        (comparison = 'outside_range'
            AND threshold_value IS NULL
            AND lower_bound IS NOT NULL
            AND upper_bound IS NOT NULL
            AND lower_bound <= upper_bound)
        OR
        (comparison <> 'outside_range'
            AND threshold_value IS NOT NULL
            AND lower_bound IS NULL
            AND upper_bound IS NULL)
    ),
    CONSTRAINT monitoring_rules_effective_window CHECK (
        effective_to IS NULL OR effective_from <= effective_to
    )
);

CREATE INDEX IF NOT EXISTS monitoring_rules_station_enabled_idx
    ON monitoring_rules (station_id, enabled);

COMMENT ON TABLE forecast_runs IS
    'Execution metadata for forecasts; generated values are stored separately from observed position_data.';
COMMENT ON TABLE forecast_results IS
    'Model-generated forecast values. These rows are never presented as observations.';
COMMENT ON TABLE imputation_runs IS
    'Execution metadata for imputation; original observations remain unchanged.';
COMMENT ON TABLE imputation_results IS
    'Model-generated replacements for selected missing fields, stored separately from observed values.';
COMMENT ON TABLE monitoring_rules IS
    'Station-specific salinity or water-level thresholds. This table stores rules only, not alert delivery events.';

COMMIT;
