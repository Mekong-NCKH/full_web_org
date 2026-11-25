#!/usr/bin/env python3
"""Export hourly TSLib rolling-origin predictions for the public research UI.

The exporter only runs inference with the pinned checkpoints produced by
reproduce_tslib_benchmark.py. It verifies the selected source, library commit,
and checkpoint hashes before publishing a static research artifact.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import numpy as np
import torch

ROOT = Path(__file__).resolve().parents[2]
RUNNER_PATH = ROOT / "research_reproduction" / "scripts" / "reproduce_tslib_benchmark.py"
DEFAULT_SOURCE = ROOT / "Sanility_GIS_Monitoring" / "BaoDinh.csv"
DEFAULT_REPORT = ROOT / "research_reproduction" / "results" / "tslib" / "benchmark.json"
DEFAULT_ARTIFACTS = ROOT / "research_reproduction" / "results" / "tslib" / "artifacts"
DEFAULT_OUTPUT = ROOT / "Web" / "public" / "research" / "forecast-backtest.json"
APPROVED_STATIONS = {"baodinh", "gocat", "vamkenh"}


def load_runner():
    spec = importlib.util.spec_from_file_location("tslib_benchmark_runner", RUNNER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load benchmark helpers: {RUNNER_PATH}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def rounded_series(values: np.ndarray) -> list[float]:
    if not np.isfinite(values).all():
        raise ValueError("Forecast output contains a non-finite value.")
    return [round(float(value), 6) for value in values]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export verified hourly predictions from the TSLib holdout backtest."
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--artifact-dir", type=Path, default=DEFAULT_ARTIFACTS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    runner = load_runner()
    report: dict[str, Any] = json.loads(args.report.read_text(encoding="utf-8"))
    source_path = args.input.resolve()
    source_hash = runner.sha256_file(source_path)
    if report["source"]["sha256"] != source_hash:
        raise ValueError("The TSLib benchmark and selected BaoDinh.csv hashes do not match.")

    library_path = ROOT / "Time-Series-Library"
    if not library_path.is_dir():
        raise FileNotFoundError(
            "Initialize the Time-Series-Library submodule before exporting predictions."
        )
    library_commit = subprocess.run(
        ["git", "-C", str(library_path), "rev-parse", "HEAD"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
    expected_library_commit = report["library"]["repository_commit"]
    if library_commit != expected_library_commit:
        raise ValueError(
            "The checked out Time-Series-Library commit does not match the benchmark: "
            f"{library_commit} != {expected_library_commit}."
        )

    stage5 = runner.load_stage5_module()
    timestamps, station_series = stage5.load_public_series(source_path)
    if set(station_series) != APPROVED_STATIONS:
        raise ValueError("Prediction export is limited to the three approved public stations.")

    labels = runner.series_labels(station_series)
    raw = np.asarray(
        [[station_series[station][target][index] for station, target in labels]
         for index in range(len(timestamps))],
        dtype=np.float64,
    )
    if not np.isfinite(raw).all():
        raise ValueError("The selected public window contains missing or non-finite values.")

    split_index = int(len(timestamps) * 0.70)
    train_end = int(split_index * 0.80)
    mean = raw[:train_end].mean(axis=0, keepdims=True)
    scale = raw[:train_end].std(axis=0, keepdims=True)
    scale[scale == 0] = 1.0
    normalized = ((raw - mean) / scale).astype(np.float32)
    marks = runner.make_time_marks(timestamps)

    if report["protocol"]["lookback_hours"] != runner.LOOKBACK:
        raise ValueError("The benchmark lookback does not match this inference code.")
    if report["protocol"]["forecast_horizon_hours"] != runner.HORIZON:
        raise ValueError("The benchmark horizon does not match this inference code.")

    model_classes = runner.import_models()
    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)

    outputs_by_model: dict[str, tuple[np.ndarray, np.ndarray, list[int]]] = {}
    for model_name in runner.MODEL_NAMES:
        artifact_path = args.artifact_dir / f"{model_name.lower()}-forecast.pt"
        model_evidence = report["model_artifacts"][model_name]["forecast_artifact"]
        if runner.sha256_file(artifact_path) != model_evidence["sha256"]:
            raise ValueError(f"Checkpoint hash mismatch for {model_name}.")

        checkpoint = torch.load(artifact_path, map_location="cpu", weights_only=False)
        if checkpoint.get("model") != model_name or checkpoint.get("task") != "forecast":
            raise ValueError(f"Checkpoint metadata mismatch for {model_name}.")
        if checkpoint.get("seq_len") != runner.LOOKBACK or checkpoint.get("pred_len") != runner.HORIZON:
            raise ValueError(f"Checkpoint window configuration mismatch for {model_name}.")
        if not np.allclose(np.asarray(checkpoint["normalization_mean"]), mean, rtol=1e-12, atol=1e-8):
            raise ValueError(f"Training means differ from the benchmark for {model_name}.")
        if not np.allclose(np.asarray(checkpoint["normalization_scale"]), scale, rtol=1e-12, atol=1e-8):
            raise ValueError(f"Training scales differ from the benchmark for {model_name}.")

        model = runner.construct_model(
            model_classes[model_name],
            runner.model_config("forecast", raw.shape[1]),
            model_name,
        )
        model.load_state_dict(checkpoint["state_dict"])
        predicted, actual, origins = runner.score_forecasts(
            model, normalized, marks, mean, scale, split_index
        )
        outputs_by_model[model_name] = (predicted, actual, origins)
        print(f"Scored {model_name}: {len(origins)} origins, {len(predicted)} points per channel")

    reference_origins = outputs_by_model[runner.MODEL_NAMES[0]][2]
    origin_rows = []
    for origin_index, target_start in enumerate(reference_origins):
        channel_rows = []
        start_at = timestamps[target_start]
        end_at = timestamps[target_start + runner.HORIZON - 1]
        for channel_index, (station_id, target) in enumerate(labels):
            model_values = {
                model_name: rounded_series(
                    outputs_by_model[model_name][0][
                        origin_index * runner.HORIZON : (origin_index + 1) * runner.HORIZON,
                        channel_index,
                    ]
                )
                for model_name in runner.MODEL_NAMES
            }
            channel_rows.append(
                {
                    "stationId": station_id,
                    "target": target,
                    "unit": "mg/L" if target == "salinity" else "m",
                    "predictions": model_values,
                }
            )
        origin_rows.append(
            {
                "index": origin_index,
                "forecastStartAt": start_at.isoformat(),
                "forecastEndAt": end_at.isoformat(),
                "contextStartAt": timestamps[target_start - runner.LOOKBACK].isoformat(),
                "contextEndAt": timestamps[target_start - 1].isoformat(),
                "series": channel_rows,
            }
        )

    if any(origins != reference_origins for _, _, origins in outputs_by_model.values()):
        raise RuntimeError("TSLib models produced inconsistent rolling forecast origins.")

    output = {
        "schemaVersion": 1,
        "classification": "offline_rolling_origin_forecast_backtest",
        "source": {
            "filename": source_path.name,
            "sha256": source_hash,
            "from": report["source"]["window_local"]["from"],
            "to": report["source"]["window_local"]["to"],
            "timezone": report["source"]["window_local"]["timezone"],
            "stations": sorted(APPROVED_STATIONS),
        },
        "library": {
            "name": "Time-Series-Library",
            "repository": "https://github.com/thuml/Time-Series-Library",
            "commit": library_commit,
            "models": list(runner.MODEL_NAMES),
        },
        "protocol": {
            "lookbackHours": runner.LOOKBACK,
            "forecastHorizonHours": runner.HORIZON,
            "holdoutStartAt": timestamps[split_index].isoformat(),
            "originCount": len(origin_rows),
            "originStrideHours": runner.HORIZON,
            "contextPolicy": "Each completed 24-hour block is observed before the next forecast origin.",
            "normalization": "Per-channel mean and standard deviation fitted only on the training split.",
        },
        "useBoundary": (
            "Historical offline backtest predictions for research display. "
            "These values are not a live forecast and do not replace observations."
        ),
        "origins": origin_rows,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(output, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "output": str(args.output),
                "library_commit": library_commit,
                "models": len(runner.MODEL_NAMES),
                "origins": len(origin_rows),
                "series_per_origin": len(labels),
                "points_per_model": len(reference_origins) * runner.HORIZON,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
