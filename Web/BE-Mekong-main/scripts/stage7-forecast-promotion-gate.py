#!/usr/bin/env python3
"""Audit Phase 5/6 forecast evidence and decide whether API promotion can proceed."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Any


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
REPORT_DIR = REPOSITORY_ROOT / "Web" / "BE-Mekong-main" / "reports"
DEFAULT_STAGE5 = REPORT_DIR / "stage5-forecast-baseline.json"
DEFAULT_STAGE6 = REPORT_DIR / "stage6-dlinear-experiment.json"
DEFAULT_ARTIFACT_DIR = REPORT_DIR / "stage6-artifacts"
DEFAULT_OUTPUT = REPORT_DIR / "stage7-forecast-promotion.json"
REQUIRED_STATIONS = ("baodinh", "gocat", "vamkenh")
REQUIRED_TARGETS = ("salinity", "water_level")
REQUIRED_BASELINES = ("persistence", "daily_seasonal_naive_24h")


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError(f"Required evidence report is missing: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def display_path(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPOSITORY_ROOT).as_posix()
    except ValueError:
        return path.name


def is_sha256(value: Any) -> bool:
    return (
        isinstance(value, str)
        and len(value) == 64
        and all(character in "0123456789abcdef" for character in value.lower())
    )


def evaluate(
    stage5: dict[str, Any],
    stage6: dict[str, Any],
    artifact_dir: Path,
) -> dict[str, Any]:
    checks: dict[str, dict[str, Any]] = {}
    reasons: list[str] = []

    stage5_source_hash = stage5.get("source", {}).get("sha256")
    stage6_source_hash = stage6.get("source", {}).get("sha256")
    source_hash_matches = (
        is_sha256(stage5_source_hash)
        and is_sha256(stage6_source_hash)
        and stage5_source_hash == stage6_source_hash
    )
    checks["source_lineage"] = {
        "status": "pass" if source_hash_matches else "fail",
        "details": "Phase 5 and Phase 6 must contain the same valid 64-character selected CSV SHA-256.",
    }
    if not source_hash_matches:
        reasons.append("Phase 5/6 source SHA-256 is missing, malformed, or inconsistent.")

    same_holdout = (
        stage6.get("protocol", {}).get("test_boundary_matches_stage5") is True
        and bool(stage5.get("protocol", {}).get("holdout_start_at"))
        and stage5.get("protocol", {}).get("holdout_start_at")
        == stage6.get("protocol", {}).get("holdout_start_at")
    )
    checks["holdout_alignment"] = {
        "status": "pass" if same_holdout else "fail",
        "details": "The model and baselines must use the same chronological holdout boundary.",
    }
    if not same_holdout:
        reasons.append("The model holdout does not match the Phase 5 baseline holdout.")

    required_model_shape = all(
        station in stage6.get("models", {})
        and all(target in stage6["models"][station] for target in REQUIRED_TARGETS)
        for station in REQUIRED_STATIONS
    )
    checks["required_station_targets"] = {
        "status": "pass" if required_model_shape else "fail",
        "details": "Six experimental station-variable models are required.",
    }
    if not required_model_shape:
        reasons.append("One or more approved station-variable models are missing.")

    artifact_records: list[dict[str, Any]] = []
    artifact_integrity = required_model_shape
    if required_model_shape:
        for station in REQUIRED_STATIONS:
            for target in REQUIRED_TARGETS:
                model = stage6["models"][station][target]
                artifact = model.get("artifact", {})
                artifact_path = artifact_dir / str(artifact.get("filename", ""))
                exists = artifact_path.is_file()
                matches = (
                    exists
                    and sha256_file(artifact_path) == artifact.get("sha256")
                )
                artifact_integrity = artifact_integrity and matches
                artifact_records.append(
                    {
                        "station_id": station,
                        "target": target,
                        "filename": artifact.get("filename"),
                        "status": "pass" if matches else "fail",
                    }
                )
    checks["checkpoint_integrity"] = {
        "status": "pass" if artifact_integrity else "fail",
        "details": "Every checkpoint file must match its reported SHA-256.",
        "artifacts": artifact_records,
    }
    if not artifact_integrity:
        reasons.append("A trained checkpoint is missing or its SHA-256 does not match.")

    metric_rows: list[dict[str, Any]] = []
    performance_passes = required_model_shape
    bias_passes = required_model_shape
    metric_n_consistent = required_model_shape

    if required_model_shape:
        for station in REQUIRED_STATIONS:
            for target in REQUIRED_TARGETS:
                model = stage6["models"][station][target]
                baseline_series = stage5.get("series", {}).get(station, {}).get(target, {})
                baseline_metrics = {
                    item["name"]: item["metrics"]
                    for item in baseline_series.get("backtest", {}).get("models", [])
                }
                evaluation_metrics = model.get("evaluation", {}).get("metrics", {})
                comparisons = model.get("comparisons", {})
                missing_baselines = [
                    name for name in REQUIRED_BASELINES if name not in baseline_metrics
                ]
                comparison_complete = all(
                    name in comparisons for name in REQUIRED_BASELINES
                )
                if missing_baselines or not comparison_complete:
                    performance_passes = False
                    bias_passes = False
                    metric_n_consistent = False
                    metric_rows.append(
                        {
                            "station_id": station,
                            "target": target,
                            "status": "fail",
                            "reason": "Required baseline or comparison record is missing.",
                        }
                    )
                    continue

                baseline_sample_counts = [
                    baseline_metrics[name].get("n")
                    for name in REQUIRED_BASELINES
                ]
                model_sample_count = evaluation_metrics.get("n")
                sample_count_ok = (
                    model_sample_count is not None
                    and all(n == model_sample_count for n in baseline_sample_counts)
                )
                metric_n_consistent = metric_n_consistent and sample_count_ok

                beats_both = all(
                    comparisons[name].get("mae_improved") is True
                    and comparisons[name].get("rmse_improved") is True
                    for name in REQUIRED_BASELINES
                )
                model_bias = evaluation_metrics.get("bias")
                daily_naive_bias = baseline_metrics[
                    "daily_seasonal_naive_24h"
                ].get("bias")
                try:
                    no_bias_degradation = (
                        math.isfinite(float(model_bias))
                        and math.isfinite(float(daily_naive_bias))
                        and abs(float(model_bias)) <= abs(float(daily_naive_bias))
                    )
                except (TypeError, ValueError):
                    no_bias_degradation = False
                performance_passes = performance_passes and beats_both
                bias_passes = bias_passes and no_bias_degradation
                metric_rows.append(
                    {
                        "station_id": station,
                        "target": target,
                        "scored_points": model_sample_count,
                        "sample_count_matches_baselines": sample_count_ok,
                        "beats_both_baselines_on_mae_and_rmse": beats_both,
                        "absolute_bias_not_worse_than_daily_naive": no_bias_degradation,
                        "dlinear_bias": model_bias,
                        "daily_seasonal_naive_bias": daily_naive_bias,
                        "dlinear_metrics": evaluation_metrics,
                        "daily_seasonal_naive_metrics": baseline_metrics[
                            "daily_seasonal_naive_24h"
                        ],
                    }
                )

    checks["matched_metric_samples"] = {
        "status": "pass" if metric_n_consistent else "fail",
        "details": "DLinear and both baselines must be scored on the same target points.",
    }
    checks["mae_rmse_vs_baselines"] = {
        "status": "pass" if performance_passes else "fail",
        "details": "DLinear must improve MAE and RMSE against both reported baselines in every series.",
    }
    checks["bias_vs_daily_naive"] = {
        "status": "pass" if bias_passes else "fail",
        "details": "Absolute prediction bias must not be worse than the stronger daily seasonal-naive baseline.",
        "series": metric_rows,
    }
    if not metric_n_consistent:
        reasons.append("Model and baseline metrics are not based on matching sample counts.")
    if not performance_passes:
        reasons.append("DLinear does not improve both MAE and RMSE against both baselines for every series.")
    if not bias_passes:
        reasons.append(
            "DLinear has worse absolute bias than daily seasonal naive in at least one series."
        )

    checks["multi_season_validation"] = {
        "status": "hold",
        "details": "The reports contain one June-July 2024 source window and one chronological holdout, not independent seasons or years.",
        "independent_windows_recorded": 1,
    }
    reasons.append("Independent multi-season or multi-year validation is not available.")

    source_quality = "unverified"
    checks["source_quality_review"] = {
        "status": "hold",
        "quality_status": source_quality,
        "details": "Imported observation provenance does not mean the measurements have been independently validated.",
    }
    reasons.append("Source observation quality remains unverified.")

    checks["owner_approved_threshold"] = {
        "status": "hold",
        "details": "No owner-approved deployment acceptance threshold is recorded.",
    }
    reasons.append("No owner-approved forecast acceptance threshold is recorded.")

    checks["execution_boundary"] = {
        "status": "pass"
        if stage6.get("decision", {}).get("database_accessed") is False
        and stage6.get("decision", {}).get("forecast_api_enabled") is False
        else "fail",
        "details": "The experiment must remain offline and must not enable the forecast API.",
    }
    if checks["execution_boundary"]["status"] == "fail":
        reasons.append("Phase 6 crossed the offline execution boundary.")

    blocking_statuses = {"fail", "hold"}
    held = any(check["status"] in blocking_statuses for check in checks.values())
    decision = "HOLD" if held else "ELIGIBLE_FOR_OWNER_REVIEW"
    return {
        "schema_version": 1,
        "stage": "stage7-forecast-promotion-gate",
        "decision": decision,
        "eligible_for_public_api": False,
        "model_version_status": "experimental",
        "phase5_source_sha256": stage5.get("source", {}).get("sha256"),
        "phase6_source_sha256": stage6.get("source", {}).get("sha256"),
        "checks": checks,
        "reasons": reasons,
        "series_evaluation": metric_rows,
        "actions_before_promotion": [
            "Review and resolve the bias degradation against daily seasonal naive.",
            "Evaluate independent periods from additional seasons or years.",
            "Review measurement quality and source provenance with the data owner.",
            "Obtain an owner-approved acceptance threshold for each target and station.",
            "Rerun this gate after the evidence and reports are updated.",
        ],
        "database_accessed": False,
        "forecast_rows_written": False,
        "forecast_api_enabled": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Audit Phase 5/6 forecasting evidence without database access."
    )
    parser.add_argument("--stage5", type=Path, default=DEFAULT_STAGE5)
    parser.add_argument("--stage6", type=Path, default=DEFAULT_STAGE6)
    parser.add_argument("--artifact-dir", type=Path, default=DEFAULT_ARTIFACT_DIR)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    decision = evaluate(
        read_json(args.stage5),
        read_json(args.stage6),
        args.artifact_dir,
    )
    decision["evidence_files"] = {
        "phase5_report": {
            "path": display_path(args.stage5),
            "sha256": sha256_file(args.stage5),
        },
        "phase6_report": {
            "path": display_path(args.stage6),
            "sha256": sha256_file(args.stage6),
        },
        "gate_script": {
            "path": display_path(Path(__file__)),
            "sha256": sha256_file(Path(__file__).resolve()),
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(decision, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "report": str(args.output),
                "decision": decision["decision"],
                "eligibleForPublicApi": decision["eligible_for_public_api"],
                "databaseAccessed": False,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
