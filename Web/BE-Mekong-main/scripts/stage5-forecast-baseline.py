#!/usr/bin/env python3
"""Build a leakage-safe, offline 24-hour forecast baseline report.

This script reads the selected source CSV only. It does not connect to a
database, train a model, write forecast rows, or enable a public forecast API.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SOURCE = REPOSITORY_ROOT / "Sanility_GIS_Monitoring" / "BaoDinh.csv"
DEFAULT_OUTPUT = (
    REPOSITORY_ROOT
    / "Web"
    / "BE-Mekong-main"
    / "reports"
    / "stage5-forecast-baseline.json"
)

PUBLIC_STATIONS = {
    "baodinh": {"salinity": "Sbaodinh", "water_level": "Zbaodinh"},
    "gocat": {"salinity": "Sgocat", "water_level": "Zgocat"},
    "vamkenh": {"salinity": "Svamkenh", "water_level": "Zvamkenh"},
}

SOURCE_TIMEZONE = timezone(timedelta(hours=7))
WINDOW_START = datetime(2024, 6, 1, 0, 0, 0, tzinfo=SOURCE_TIMEZONE)
WINDOW_END = datetime(2024, 7, 31, 23, 59, 59, tzinfo=SOURCE_TIMEZONE)
HOURS_PER_STATION = 61 * 24
HORIZON_HOURS = 24
TRAIN_FRACTION = 0.70


def parse_source_datetime(raw_value: str, row_number: int) -> datetime:
    try:
        parsed = datetime.strptime(raw_value.strip(), "%Y-%m-%d %H:%M:%S")
    except ValueError as error:
        raise ValueError(
            f"Invalid Date value at CSV row {row_number}: {raw_value!r}"
        ) from error
    return parsed.replace(tzinfo=SOURCE_TIMEZONE)


def parse_measurement(raw_value: str, label: str, row_number: int) -> float | None:
    value = raw_value.strip()
    if value == "":
        return None
    try:
        parsed = float(value)
    except ValueError as error:
        raise ValueError(
            f"Invalid numeric value for {label} at CSV row {row_number}"
        ) from error
    if not math.isfinite(parsed):
        raise ValueError(
            f"Non-finite numeric value for {label} at CSV row {row_number}"
        )
    return parsed


def load_public_series(
    source_path: Path,
) -> tuple[list[datetime], dict[str, dict[str, list[float | None]]]]:
    if not source_path.is_file():
        raise FileNotFoundError(f"Selected source file not found: {source_path}")

    expected_times = [
        WINDOW_START + timedelta(hours=hour)
        for hour in range(HOURS_PER_STATION)
    ]
    expected_time_set = set(expected_times)
    series: dict[str, dict[str, list[float | None]]] = {
        station_id: {
            "salinity": [None] * HOURS_PER_STATION,
            "water_level": [None] * HOURS_PER_STATION,
        }
        for station_id in PUBLIC_STATIONS
    }
    seen_times: set[datetime] = set()
    required_headers = {
        "Date",
        *(
            column
            for fields in PUBLIC_STATIONS.values()
            for column in fields.values()
        ),
    }

    with source_path.open("r", encoding="utf-8-sig", newline="") as input_file:
        reader = csv.DictReader(input_file)
        headers = set(reader.fieldnames or [])
        missing_headers = sorted(required_headers - headers)
        if missing_headers:
            raise ValueError(
                "BaoDinh.csv is missing required public columns: "
                + ", ".join(missing_headers)
            )

        for row_number, row in enumerate(reader, start=2):
            raw_date = row.get("Date", "")
            observed_at = parse_source_datetime(raw_date, row_number)
            if not WINDOW_START <= observed_at <= WINDOW_END:
                continue
            if observed_at not in expected_time_set:
                raise ValueError(
                    "Public-window timestamps must be on the expected hourly "
                    f"grid; found {raw_date!r} at CSV row {row_number}"
                )
            if observed_at in seen_times:
                raise ValueError(
                    f"Duplicate public-window timestamp: {raw_date!r}"
                )
            seen_times.add(observed_at)
            index = int((observed_at - WINDOW_START).total_seconds() // 3600)

            for station_id, fields in PUBLIC_STATIONS.items():
                source_salinity = parse_measurement(
                    row.get(fields["salinity"], ""),
                    fields["salinity"],
                    row_number,
                )
                series[station_id]["salinity"][index] = (
                    None if source_salinity is None else source_salinity * 1000
                )
                series[station_id]["water_level"][index] = parse_measurement(
                    row.get(fields["water_level"], ""),
                    fields["water_level"],
                    row_number,
                )

    if len(seen_times) != HOURS_PER_STATION:
        raise ValueError(
            "Expected exactly "
            f"{HOURS_PER_STATION} hourly source rows in the public window; "
            f"found {len(seen_times)}."
        )
    return expected_times, series


def summarize_values(values: list[float | None]) -> dict[str, int]:
    numeric_values = [value for value in values if value is not None]
    return {
        "row_count": len(values),
        "numeric_count": len(numeric_values),
        "missing_count": len(values) - len(numeric_values),
        "zero_count": sum(value == 0 for value in numeric_values),
        "negative_count": sum(value < 0 for value in numeric_values),
    }


def calculate_metrics(errors: list[float]) -> dict[str, float | int | None]:
    if not errors:
        return {"n": 0, "mae": None, "rmse": None, "bias": None}
    return {
        "n": len(errors),
        "mae": round(sum(abs(error) for error in errors) / len(errors), 6),
        "rmse": round(
            math.sqrt(sum(error * error for error in errors) / len(errors)), 6
        ),
        "bias": round(sum(errors) / len(errors), 6),
    }


def evaluate_series(
    values: list[float | None],
    timestamps: list[datetime],
    split_index: int,
) -> dict[str, Any]:
    persistence_errors: list[float] = []
    seasonal_errors: list[float] = []
    target_count = 0
    missing_target_count = 0
    persistence_missing_input_count = 0
    seasonal_missing_input_count = 0
    origin_count = 0
    target_starts = range(
        split_index,
        len(values) - HORIZON_HOURS + 1,
        HORIZON_HOURS,
    )

    for target_start in target_starts:
        origin_index = target_start - 1
        origin_count += 1
        persistence_value = next(
            (
                values[index]
                for index in range(origin_index, -1, -1)
                if values[index] is not None
            ),
            None,
        )

        for horizon_offset in range(HORIZON_HOURS):
            target_index = target_start + horizon_offset
            actual = values[target_index]
            if actual is None:
                missing_target_count += 1
                continue
            target_count += 1

            if persistence_value is None:
                persistence_missing_input_count += 1
            else:
                persistence_errors.append(persistence_value - actual)

            seasonal_index = target_index - 24
            seasonal_value = (
                values[seasonal_index]
                if seasonal_index <= origin_index
                else None
            )
            if seasonal_value is None:
                seasonal_missing_input_count += 1
            else:
                seasonal_errors.append(seasonal_value - actual)

    test_start_index = split_index
    test_end_index = min(
        split_index + origin_count * HORIZON_HOURS - 1,
        len(timestamps) - 1,
    )
    return {
        "evaluation_targets": target_count,
        "missing_targets": missing_target_count,
        "origin_count": origin_count,
        "test_window": {
            "from": timestamps[test_start_index].isoformat(),
            "to": timestamps[test_end_index].isoformat(),
        },
        "models": [
            {
                "name": "persistence",
                "description": "Repeat the latest numeric observation at the forecast origin.",
                "predictions_unavailable_due_to_missing_input": persistence_missing_input_count,
                "metrics": calculate_metrics(persistence_errors),
            },
            {
                "name": "daily_seasonal_naive_24h",
                "description": "Use the observed value at the same hour on the previous day.",
                "predictions_unavailable_due_to_missing_input": seasonal_missing_input_count,
                "metrics": calculate_metrics(seasonal_errors),
            },
        ],
    }


def build_report(source_path: Path) -> dict[str, Any]:
    timestamps, series = load_public_series(source_path)
    source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
    runner_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    split_index = int(len(timestamps) * TRAIN_FRACTION)
    holdout_origin_count = (len(timestamps) - split_index) // HORIZON_HOURS
    if holdout_origin_count == 0:
        raise ValueError("The selected time window is too short for the holdout.")

    station_reports: dict[str, Any] = {}
    for station_id, variables in series.items():
        station_reports[station_id] = {}
        for variable, values in variables.items():
            source_unit = "g/L" if variable == "salinity" else "m"
            unit = "mg/L" if variable == "salinity" else "m"
            station_reports[station_id][variable] = {
                "source_unit": source_unit,
                "unit": unit,
                "data_quality": summarize_values(values),
                "backtest": evaluate_series(values, timestamps, split_index),
            }

    return {
        "schema_version": 1,
        "stage": "stage5-forecast-baseline",
        "classification": "offline_research_evidence",
        "source": {
            "filename": source_path.name,
            "sha256": source_hash,
            "stations": list(PUBLIC_STATIONS),
            "window_local": {
                "from": WINDOW_START.isoformat(),
                "to": WINDOW_END.isoformat(),
                "timezone": "UTC+07:00",
            },
            "source_salinity_unit": "g/L",
            "normalized_salinity_unit": "mg/L",
            "water_level_unit": "m",
        },
        "runner": {
            "filename": Path(__file__).name,
            "sha256": runner_hash,
        },
        "protocol": {
            "data_rows_per_station": len(timestamps),
            "chronological_initial_history_fraction": TRAIN_FRACTION,
            "initial_history_end_at": timestamps[split_index - 1].isoformat(),
            "holdout_start_at": timestamps[split_index].isoformat(),
            "horizon_hours": HORIZON_HOURS,
            "origin_stride_hours": HORIZON_HOURS,
            "origin_count_per_series": holdout_origin_count,
            "unscored_holdout_tail_hours": (
                len(timestamps) - split_index
            ) % HORIZON_HOURS,
            "missing_values": (
                "Preserved; no imputation; affected targets or predictions "
                "are excluded and counted."
            ),
            "metrics": ["MAE", "RMSE", "bias"],
            "bias_convention": "prediction_minus_observation",
            "mape": "Not used because source values may be zero or negative.",
            "model_training_performed": False,
            "learned_parameters": [],
        },
        "series": station_reports,
        "decision": {
            "forecast_api_enabled": False,
            "reason": (
                "Persistence baselines are comparison references only. "
                "They do not establish an accepted forecasting model or "
                "operational forecast quality."
            ),
            "database_accessed": False,
            "forecast_rows_written": False,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a public-window, offline 24-hour baseline backtest."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_SOURCE,
        help="Selected BaoDinh.csv source file.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="JSON report path.",
    )
    args = parser.parse_args()

    report = build_report(args.input.resolve())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "report": str(args.output),
                "stations": list(PUBLIC_STATIONS),
                "rowsPerStation": HOURS_PER_STATION,
                "forecastApiEnabled": False,
                "databaseAccessed": False,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
