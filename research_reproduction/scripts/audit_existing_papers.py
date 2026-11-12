#!/usr/bin/env python3
"""Create source and reproducibility audits for the two local research papers."""

from __future__ import annotations

import csv
import hashlib
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "research_reproduction" / "results" / "paper-audit.json"


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def normalized_name(raw: str) -> str:
    return raw.strip().replace("_x", "").replace("_y", "")


def data_profile(path: Path, station_columns: list[str]) -> dict[str, Any]:
    rows = read_csv(path)
    date_col = "Date" if "Date" in rows[0] else "time"
    parsed_dates = [datetime.strptime(row[date_col], "%Y-%m-%d %H:%M:%S") for row in rows]
    series = {}
    for col in station_columns:
        numeric = [float(row[col]) for row in rows if (row.get(col) or "").strip()]
        series[col] = {
            "row_count": len(rows),
            "numeric_count": len(numeric),
            "missing_count": len(rows) - len(numeric),
            "zero_count": sum(value == 0 for value in numeric),
            "negative_count": sum(value < 0 for value in numeric),
        }
    return {
        "filename": path.name,
        "sha256": file_hash(path),
        "row_count": len(rows),
        "start": parsed_dates[0].isoformat(sep=" "),
        "end": parsed_dates[-1].isoformat(sep=" "),
        "series": series,
    }


def audit_chi_paper() -> dict[str, Any]:
    paper = ROOT / "Sanility_GIS_Monitoring" / "Chi_et_al___IAAA_2026_Paper.pdf"
    long_data_path = ROOT / "Sanility_GIS_Monitoring" / "converted_long_format.csv"
    coords_path = ROOT / "Sanility_GIS_Monitoring" / "cong_locations.csv"
    source_rows = read_csv(long_data_path)
    coords = read_csv(coords_path)
    raw_stations: dict[str, list[dict[str, str]]] = defaultdict(list)
    normalized_station_time: dict[tuple[str, str], list[float]] = defaultdict(list)
    for row in source_rows:
        name = row["name"].strip()
        normalized = normalized_name(name)
        raw_stations[name].append(row)
        normalized_station_time[(normalized, row["time"])].append(float(row["salinity"]))

    coordinate_names = {normalized_name(row["name"]).casefold() for row in coords}
    normalized_names = {normalized_name(name).casefold() for name in raw_stations}
    duplicate_keys = [values for values in normalized_station_time.values() if len(values) > 1]
    duplicate_value_mismatches = sum(
        1 for values in duplicate_keys if max(values) - min(values) > 1e-12
    )
    days = {
        row["time"][:10]
        for row in source_rows
    }
    raw_datetime_count = len({row["time"] for row in source_rows})
    approved = {"bao dinh", "go cat", "vam kenh"}
    approved_streams = [name for name in raw_stations if normalized_name(name).casefold() in approved]
    missing_coordinates = sorted(normalized_names - coordinate_names)

    return {
        "paper": {"filename": paper.name, "sha256": file_hash(paper)},
        "status": "source_profile_reproduced; headline_decision_metrics_not_reproducible",
        "source_data": {
            "filename": long_data_path.name,
            "sha256": file_hash(long_data_path),
            "rows": len(source_rows),
            "distinct_timestamps": raw_datetime_count,
            "distinct_calendar_days": len(days),
            "start": min(row["time"] for row in source_rows),
            "end": max(row["time"] for row in source_rows),
            "raw_station_streams": len(raw_stations),
            "normalized_station_names": len(normalized_names),
            "coordinate_records": len(coords),
            "normalized_station_names_without_coordinates": len(missing_coordinates),
            "normalized_coordinate_duplicate_station_timestamp_keys": len(duplicate_keys),
            "duplicate_keys_with_conflicting_salinity_values": duplicate_value_mismatches,
            "note": "Two source streams normalize to one approved gate name at the same coordinate; a leave-one-gate-out split must remove all streams for that physical gate together.",
            "approved_station_scope": {
                "verified_gate_count": 3,
                "source_stream_count_for_those_gates": len(approved_streams),
                "salinity_unit_in_source": "g/L",
            },
        },
        "paper_reported_results_not_recomputed": {
            "decision_instances": 2160,
            "operator_agreement_percent": {"ground_only": 68.2, "aerial_ground": 79.5},
            "threshold_violation_percent": {"ground_only": 12.4, "aerial_ground": 6.7},
            "switching_rate": {"ground_only": 0.31, "aerial_ground": 0.22},
        },
        "reproducibility_gaps": [
            "The paper describes operator preference as the reference but no operator-labelled decisions or historical operation records are present in the available data files.",
            "The paper does not fully specify IDW power/search neighborhood, the normalization of ground and interpolated salinity, uncertainty sigma, or local safe-threshold values needed to reproduce the risk score and violation labels.",
            "The local map prototype scripts do not implement the paper's stated risk equation or provide its reported metric calculations.",
            "The paper reports 2,160 decisions, while the available source spans 243 calendar days and contains duplicate same-gate streams; the exact day/gate filtering that yields the reported count is not documented.",
            "IDW leave-one-out must exclude every record at the held-out physical gate, not only one duplicate source row, or the normalized duplicate stream leaks the answer at the same coordinates.",
        ],
        "reproduction_boundary": "Data counts and source coverage were recalculated. Decision agreement, safety, and stability figures remain claims from the paper because their labels and complete algorithm settings are unavailable.",
    }


def audit_pistof() -> dict[str, Any]:
    paper = ROOT / "PI-STOF-Estuarine-Salinity-main" / "papers" / "preprint" / "PI-STOF_Preprint.pdf"
    sample = ROOT / "PI-STOF-Estuarine-Salinity-main" / "data" / "sample" / "raw_sample.csv"
    sample_rows = read_csv(sample)
    raw_values = [row.get("Zxuanhoa", "").strip() for row in sample_rows]
    missing = [not value for value in raw_values]
    longest_gap = run = 0
    for absent in missing:
        run = run + 1 if absent else 0
        longest_gap = max(longest_gap, run)
    sample_info: dict[str, Any] = {
        "filename": sample.name,
        "sha256": file_hash(sample),
        "hours": len(sample_rows),
        "start": sample_rows[0]["Date"],
        "end": sample_rows[-1]["Date"],
        "observed_count": sum(not value for value in missing),
        "missing_count": sum(missing),
        "missing_fraction": round(sum(missing) / len(missing), 6),
        "longest_consecutive_missing_run_hours": longest_gap,
    }
    cleaned = ROOT / "research_reproduction" / "results" / "pistof_sample_2020" / "clean_sample.csv"
    grid = ROOT / "research_reproduction" / "results" / "pistof_sample_2020" / "tables" / "grid_search.csv"
    ablation = ROOT / "research_reproduction" / "results" / "pistof_sample_2020" / "tables" / "Table_3_Ablation.csv"
    grid_result = None
    if grid.is_file():
        grid_rows = read_csv(grid)
        best = min(grid_rows, key=lambda row: float(row["Total Physical Loss (L_PI)"]))
        grid_result = {
            "rows": len(grid_rows),
            "best_w25": int(best["Micro-filter (w_25)"]),
            "best_w354": int(best["Macro-filter (w_354)"]),
            "minimum_composite_loss": float(best["Total Physical Loss (L_PI)"]),
            "best_row": best,
        }
    ablation_result = None
    if ablation.is_file():
        ablation_rows = read_csv(ablation)
        row_by_model = {row["Model"]: row for row in ablation_rows}
        default_row = row_by_model["Baseline 1: MSTL Default (11, 15, Auto Trend)"]
        fixed_row = row_by_model["Baseline 2: Ablated MSTL (11, 15, Trend=4381)"]
        optimal_row = row_by_model["PI-STOF: Optimal PGML (7, 91, Trend=4381)"]
        default_loss = float(default_row["L_PI"])
        fixed_loss = float(fixed_row["L_PI"])
        optimal_loss = float(optimal_row["L_PI"])
        ablation_result = {
            "rows": len(ablation_rows),
            "default_loss": default_loss,
            "fixed_trend_baseline_loss": fixed_loss,
            "optimized_loss": optimal_loss,
            "optimized_leakage": float(optimal_row["L_Leakage"]),
            "optimized_orthogonality": float(optimal_row["L_Ortho"]),
            "optimized_baseflow": float(optimal_row["L_Baseflow"]),
            "relative_reduction_vs_fixed_trend_percent": round((1 - optimal_loss / fixed_loss) * 100, 4),
            "relative_reduction_vs_default_percent": round((1 - optimal_loss / default_loss) * 100, 4),
            "matches_paper_headline_loss": abs(optimal_loss - 0.0181) < 0.00005,
            "matches_paper_headline_leakage": abs(float(optimal_row["L_Leakage"]) - 0.0036) < 0.00005,
        }
    return {
        "paper": {"filename": paper.name, "sha256": file_hash(paper)},
        "status": "included_sample_pipeline_reproduced; full_paper_headline_not_reproduced_on_available_sample",
        "paper_claims": {
            "hours": 49680,
            "years": "2019-2024",
            "best_configuration": {"w25": 7, "w354": 91, "wtrend": 4381},
            "optimized_composite_loss": 0.0181,
            "fixed_trend_baseline_loss": 0.0430,
            "unconstrained_baseline_loss": 0.0484,
            "headline_relative_loss_reduction_percent": 57.91,
            "headline_spectral_leakage_percent": {"baseline": 1.72, "optimized": 0.36},
        },
        "included_sample": sample_info,
        "sample_pipeline_rerun": {
            "preprocessed_output_retained": cleaned.is_file(),
            "preprocessed_output_filename": cleaned.name,
            "preprocessed_output_policy": "The row-level scratch output is removed after the reproduction; only aggregate tables and metrics are retained.",
            "grid_search": grid_result,
            "ablation_table": ablation_result,
            "reproduction_boundary": "The included 2020 sample permits a code-path rerun only. It is 8,784 hours rather than the paper's 49,680-hour series and is not an independent validation set.",
            "interpretation": "The checked-in Table 2 and Table 3 are reproduced on the included sample, but those sample values differ from the PDF headline loss (0.0181) and leakage (0.0036). The full-period result cannot be checked without the claimed multi-year source series.",
        },
        "current_selected_public_source": {
            "filename": "BaoDinh.csv",
            "window_hours": 1464,
            "required_columns_for_paper_target_present": False,
            "reason": "The selected public station data does not include the paper's original target column or multi-year window; the six-month 4,381-hour trend prior is longer than the entire approved window.",
        },
        "validity_findings": [
            "The grid-search objective is evaluated on the same full sequence used to select the parameters; the current artifact does not supply an untouched chronological holdout for the decomposition losses.",
            "The paper's claim that a deterministic rerun makes significance tests mathematically inapplicable does not establish robustness to period selection, data windows, station choice, or sampling uncertainty.",
            "Lower spectral penalties and lower linear component correlation show alignment with the chosen objective, not that the decomposition improves downstream forecasts. The paper itself reserves downstream forecasting validation for future work.",
            "The included sample has a large missing fraction and preprocessing fills values before decomposition; the paper's outputs therefore depend materially on the interpolation rule and should not be treated as direct independent physical observations.",
        ],
    }


def audit_selected_source() -> dict[str, Any]:
    path = ROOT / "Sanility_GIS_Monitoring" / "BaoDinh.csv"
    rows = read_csv(path)
    columns = ["Sbaodinh", "Zbaodinh", "Sgocat", "Zgocat", "Svamkenh", "Zvamkenh"]
    start = datetime.strptime("2024-06-01 00:00:00", "%Y-%m-%d %H:%M:%S")
    end = datetime.strptime("2024-07-31 23:59:59", "%Y-%m-%d %H:%M:%S")
    selected = [row for row in rows if start <= datetime.strptime(row["Date"], "%Y-%m-%d %H:%M:%S") <= end]
    return data_profile_from_rows(path, selected, columns)


def data_profile_from_rows(path: Path, rows: list[dict[str, str]], columns: list[str]) -> dict[str, Any]:
    series = {}
    for column in columns:
        numeric = [float(row[column]) for row in rows if (row.get(column) or "").strip()]
        series[column] = {
            "row_count": len(rows),
            "numeric_count": len(numeric),
            "missing_count": len(rows) - len(numeric),
            "zero_count": sum(value == 0 for value in numeric),
            "negative_count": sum(value < 0 for value in numeric),
        }
    return {
        "filename": path.name,
        "sha256": file_hash(path),
        "window_start": rows[0]["Date"],
        "window_end": rows[-1]["Date"],
        "hourly_rows": len(rows),
        "six_public_series": series,
        "note": "Missing, zero, and negative values are counted separately; salinity conversion is applied only in forecasting scripts.",
    }


def main() -> None:
    report = {
        "schema_version": 1,
        "stage": "local-paper-reproduction-audit",
        "classification": "offline_research_evidence",
        "observation_and_gis_paper": audit_chi_paper(),
        "time_series_decomposition_paper": audit_pistof(),
        "selected_public_window": audit_selected_source(),
        "database_accessed": False,
        "forecast_api_enabled": False,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({"report": str(OUTPUT), "chi_claims_recomputed": False, "pistof_sample_grid_rerun": report["time_series_decomposition_paper"]["sample_pipeline_rerun"]["grid_search"] is not None, "database_accessed": False}, ensure_ascii=False))


if __name__ == "__main__":
    main()
