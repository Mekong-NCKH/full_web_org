#!/usr/bin/env python3
"""Export aggregate forecasting and imputation evidence for the home UI.

The output contains metrics only. It deliberately excludes observation rows,
predicted values, model checkpoints, and any data from unapproved stations.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
REPORT_PATH = ROOT / "research_reproduction" / "results" / "tslib" / "benchmark.json"
OUTPUT_PATH = ROOT / "Web" / "public" / "research" / "imputation-benchmark.json"
PAPER_PATH = ROOT / "research_reproduction" / "papers" / "imputation-assessment-mekong.md"
PUBLIC_PAPER_PATH = ROOT / "Web" / "public" / "research" / "imputation-assessment.md"
SOURCE_PATH = ROOT / "Sanility_GIS_Monitoring" / "BaoDinh.csv"
STAGE5_PATH = ROOT / "Web" / "BE-Mekong-main" / "reports" / "stage5-forecast-baseline.json"
STAGE6_PATH = ROOT / "Web" / "BE-Mekong-main" / "reports" / "stage6-dlinear-experiment.json"
STAGE5_SCRIPT = ROOT / "Web" / "BE-Mekong-main" / "scripts" / "stage5-forecast-baseline.py"
APPROVED_STATIONS = {"baodinh", "gocat", "vamkenh"}
MODEL_DESCRIPTIONS = {
    "TimesNet": "Mô hình hóa biến thiên trong ngày và giữa các chu kỳ bằng biểu diễn 2D.",
    "PatchTST": "Chia chuỗi thành các đoạn thời gian nhỏ để giữ cấu trúc cục bộ và học quan hệ dài hạn.",
    "DLinear": "Tách thành phần xu thế và phần dao động rồi dùng các phép chiếu tuyến tính.",
    "iTransformer": "Xem từng biến đo như một token để học quan hệ giữa các kênh.",
}


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_stage5_module():
    spec = importlib.util.spec_from_file_location("stage5_contract", STAGE5_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError("Không thể nạp hợp đồng dữ liệu Stage 5.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def normalized(metric: dict[str, Any], scale: float) -> dict[str, float | int]:
    return {
        "n": int(metric["n"]),
        "mae": float(metric["mae"]),
        "rmse": float(metric["rmse"]),
        "bias": float(metric["bias"]),
        "normalizedMae": float(metric["mae"]) / scale,
        "normalizedRmse": float(metric["rmse"]) / scale,
    }


def main() -> None:
    report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    stage5_report = json.loads(STAGE5_PATH.read_text(encoding="utf-8"))
    stage6_report = json.loads(STAGE6_PATH.read_text(encoding="utf-8"))
    stage5 = load_stage5_module()
    timestamps, station_series = stage5.load_public_series(SOURCE_PATH)
    source_hash = sha256_file(SOURCE_PATH)
    if report["source"]["sha256"] != source_hash:
        raise ValueError("Báo cáo TSLib không khớp hash BaoDinh.csv hiện tại.")
    if set(station_series) != APPROVED_STATIONS:
        raise ValueError("Chỉ xuất ba trạm công khai đã xác minh tọa độ.")

    labels = [
        (station, target)
        for station, targets in station_series.items()
        for target in targets
    ]
    raw = np.asarray(
        [[station_series[station][target][index] for station, target in labels]
         for index in range(len(timestamps))],
        dtype=np.float64,
    )
    split_index = int(len(timestamps) * 0.70)
    train_end = int(split_index * 0.80)
    scales = raw[:train_end].std(axis=0)
    scales[scales == 0] = 1.0

    model_names = list(report["imputation_models"])
    model_scores: dict[str, list[float]] = {name: [] for name in model_names}
    forecast_scores: dict[str, list[float]] = {
        name: [] for name in report["forecast_models"]
    }
    baseline_scores: dict[str, list[float]] = {
        "train_mean": [],
        "linear_interpolation": [],
    }
    forecast_baseline_scores: dict[str, list[float]] = {
        "persistence": [],
        "daily_seasonal_naive_24h": [],
        "dlinear_univariate": [],
    }
    forecast_baseline_rmse_scores: dict[str, list[float]] = {
        name: [] for name in forecast_baseline_scores
    }
    series_rows: list[dict[str, Any]] = []
    model_reports = report["imputation_models"]
    forecast_reports = report["forecast_models"]
    baseline_report = model_reports["DLinear"]["metrics_by_series"]
    negative_counts: dict[str, int] = {}

    for index, (station, target) in enumerate(labels):
        scale = float(scales[index])
        per_model: dict[str, dict[str, float | int]] = {}
        for name in model_names:
            source_metric = model_reports[name]["metrics_by_series"][station][target]
            metric = normalized(source_metric["metrics"], scale)
            per_model[name] = metric
            model_scores[name].append(float(metric["normalizedMae"]))

        per_forecast_model: dict[str, dict[str, float | int]] = {}
        for name, model in forecast_reports.items():
            source_metric = model["metrics_by_series"][station][target]["metrics"]
            metric = normalized(source_metric, scale)
            per_forecast_model[name] = metric
            forecast_scores[name].append(float(metric["normalizedMae"]))

        base_source = baseline_report[station][target]
        baselines = {
            "train_mean": normalized(base_source["train_mean"], scale),
            "linear_interpolation": normalized(
                base_source["linear_interpolation"], scale
            ),
        }
        for name, metric in baselines.items():
            baseline_scores[name].append(float(metric["normalizedMae"]))

        stage5_models = {
            row["name"]: row["metrics"]
            for row in stage5_report["series"][station][target]["backtest"]["models"]
        }
        stage6_metric = stage6_report["models"][station][target]["evaluation"]["metrics"]
        per_forecast_baselines = {
            "persistence": normalized(stage5_models["persistence"], scale),
            "daily_seasonal_naive_24h": normalized(
                stage5_models["daily_seasonal_naive_24h"], scale
            ),
            "dlinear_univariate": normalized(stage6_metric, scale),
        }
        for name, metric in per_forecast_baselines.items():
            forecast_baseline_scores[name].append(float(metric["normalizedMae"]))
            forecast_baseline_rmse_scores[name].append(
                float(metric["normalizedRmse"])
            )

        unit = "mg/L" if target == "salinity" else "m"
        values = station_series[station][target]
        if target == "salinity":
            negative_counts[station] = sum(value < 0 for value in values)
        series_rows.append(
            {
                "stationId": station,
                "stationLabel": {
                    "baodinh": "Bao Dinh",
                    "gocat": "Go Cat",
                    "vamkenh": "Vam Kenh",
                }[station],
                "target": target,
                "targetLabel": "Độ mặn" if target == "salinity" else "Mực nước",
                "unit": unit,
                "maskedPoints": int(per_model["TimesNet"]["n"]),
                "models": per_model,
                "baselines": baselines,
                "forecastModels": per_forecast_model,
                "forecastBaselines": per_forecast_baselines,
            }
        )

    mean_nmae = {
        name: float(np.mean(values)) for name, values in model_scores.items()
    }
    model_rows = [
        {
            "name": name,
            "normalizedMae": mean_nmae[name],
            "normalizedRmse": float(
                np.mean([
                    float(model_reports[name]["metrics_by_series"][station][target]["metrics"]["rmse"])
                    / float(scales[index])
                    for index, (station, target) in enumerate(labels)
                ])
            ),
            "description": MODEL_DESCRIPTIONS[name],
            "bestEpoch": int(model_reports[name]["training"]["best_epoch"]),
        }
        for name in model_names
    ]
    model_rows.sort(key=lambda row: row["normalizedMae"])
    for rank, row in enumerate(model_rows, start=1):
        row["rank"] = rank

    forecast_model_rows = [
        {
            "name": name,
            "normalizedMae": float(np.mean(forecast_scores[name])),
            "normalizedRmse": float(
                np.mean([
                    float(forecast_reports[name]["metrics_by_series"][station][target]["metrics"]["rmse"])
                    / float(scales[index])
                    for index, (station, target) in enumerate(labels)
                ])
            ),
            "bestEpoch": int(forecast_reports[name]["training"]["best_epoch"]),
        }
        for name in forecast_reports
    ]
    forecast_model_rows.sort(key=lambda row: row["normalizedMae"])
    for rank, row in enumerate(forecast_model_rows, start=1):
        row["rank"] = rank

    forecast_baseline_rows = [
        {
            "name": name,
            "label": {
                "persistence": "Persistence",
                "daily_seasonal_naive_24h": "Daily seasonal naive 24h",
                "dlinear_univariate": "DLinear đơn biến (Stage 6)",
            }[name],
            "normalizedMae": float(np.mean(scores)),
            "normalizedRmse": float(np.mean(forecast_baseline_rmse_scores[name])),
        }
        for name, scores in forecast_baseline_scores.items()
    ]

    forecast_rank = {row["name"]: row["rank"] for row in forecast_model_rows}
    imputation_rank = {row["name"]: row["rank"] for row in model_rows}
    combined_rows = []
    for name in model_names:
        forecast_mean = float(np.mean(forecast_scores[name]))
        imputation_mean = mean_nmae[name]
        combined_rows.append(
            {
                "name": name,
                "forecastRank": int(forecast_rank[name]),
                "imputationRank": int(imputation_rank[name]),
                "meanTaskRank": (forecast_rank[name] + imputation_rank[name]) / 2,
                "meanNormalizedMae": (forecast_mean + imputation_mean) / 2,
            }
        )
    combined_rows.sort(key=lambda row: (row["meanTaskRank"], row["meanNormalizedMae"]))
    for rank, row in enumerate(combined_rows, start=1):
        row["combinedRank"] = rank

    baseline_rows = [
        {
            "name": name,
            "label": "Trung bình tập huấn luyện"
            if name == "train_mean"
            else "Nội suy tuyến tính",
            "normalizedMae": float(np.mean(scores)),
            "normalizedRmse": float(
                np.mean([
                    float(baseline_report[station][target][name]["rmse"])
                    / float(scales[index])
                    for index, (station, target) in enumerate(labels)
                ])
            ),
        }
        for name, scores in baseline_scores.items()
    ]

    output = {
        "schemaVersion": 1,
        "classification": "experimental_aggregate_evidence",
        "source": {
            "filename": SOURCE_PATH.name,
            "sha256": source_hash,
            "from": report["source"]["window_local"]["from"],
            "to": report["source"]["window_local"]["to"],
            "timezone": report["source"]["window_local"]["timezone"],
            "stations": sorted(APPROVED_STATIONS),
            "seriesCount": len(labels),
            "observationCountPerSeries": len(timestamps),
            "salinityUnit": "mg/L; source g/L multiplied by 1000",
            "waterLevelUnit": "m",
        },
        "protocol": {
            "forecastHorizonHours": int(report["protocol"]["forecast_horizon_hours"]),
            "forecastHoldoutStart": report["protocol"]["holdout_start_at"],
            "forecastOriginCount": 18,
            "forecastScoredPointsPerSeries": 432,
            "lookbackHours": int(report["protocol"]["lookback_hours"]),
            "holdoutStart": report["protocol"]["holdout_start_at"],
            "holdoutHours": len(timestamps) - split_index,
            "maskRate": float(report["protocol"]["imputation_mask_rate"]),
            "masking": "MCAR point masks, deterministic, shared between models",
            "maskedPointsPerSeries": int(round((len(timestamps) - split_index) * report["protocol"]["imputation_mask_rate"])),
            "seed": int(report["protocol"]["seed"]),
            "metric": "Macro average of per-series MAE and RMSE divided by standard deviation from the training segment.",
        },
        "qualityFlags": {
            "sourceHasNoMissingValuesInSelectedWindow": True,
            "negativeSalinityObservationsByStation": negative_counts,
            "negativeValuesPreserved": True,
        },
        "models": model_rows,
        "baselines": baseline_rows,
        "forecastModels": forecast_model_rows,
        "forecastBaselines": forecast_baseline_rows,
        "combinedRanking": {
            "rule": "Average rank of the four TSLib models over forecast and imputation; ties are resolved by lower equal-weight mean macro nMAE.",
            "models": combined_rows,
        },
        "series": series_rows,
        "useBoundary": "Research benchmark only. It contains aggregate forecasting and imputation errors, not replacement observations or deployed forecast values.",
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(output, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    shutil.copyfile(PAPER_PATH, PUBLIC_PAPER_PATH)
    print(json.dumps({"output": str(OUTPUT_PATH), "paper": str(PUBLIC_PAPER_PATH), "models": len(model_rows), "series": len(series_rows), "source_sha256": source_hash}, ensure_ascii=False))


if __name__ == "__main__":
    main()
