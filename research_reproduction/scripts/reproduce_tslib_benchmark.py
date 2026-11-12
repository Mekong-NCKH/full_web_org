#!/usr/bin/env python3
"""Adapt a small TSLib forecast/imputation benchmark to the approved dataset.

All runs are local and offline. The selected CSV is read through the existing
Stage 5 data contract, so public stations, units, timestamps, and missing values
are handled exactly as in the forecast baseline experiment.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import importlib.util
import json
import math
import random
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Callable

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parents[2]
TSLIB = ROOT / "Time-Series-Library"
BACKEND_SCRIPTS = ROOT / "Web" / "BE-Mekong-main" / "scripts"
DEFAULT_SOURCE = ROOT / "Sanility_GIS_Monitoring" / "BaoDinh.csv"
DEFAULT_BASELINE = ROOT / "Web" / "BE-Mekong-main" / "reports" / "stage5-forecast-baseline.json"
DEFAULT_STAGE6 = ROOT / "Web" / "BE-Mekong-main" / "reports" / "stage6-dlinear-experiment.json"
DEFAULT_OUTPUT = ROOT / "research_reproduction" / "results" / "tslib" / "benchmark.json"
DEFAULT_ARTIFACTS = ROOT / "research_reproduction" / "results" / "tslib" / "artifacts"

SEED = 20261111
LOOKBACK = 96
HORIZON = 24
MOVING_AVERAGE = 25
MASK_RATE = 0.25
BATCH_SIZE = 32
LEARNING_RATE = 1e-4
MAX_EPOCHS = 40
PATIENCE = 7
MODEL_NAMES = ("DLinear", "PatchTST", "iTransformer", "TimesNet")


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_stage5_module():
    path = BACKEND_SCRIPTS / "stage5-forecast-baseline.py"
    spec = importlib.util.spec_from_file_location("stage5_contract", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load data contract: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def import_models():
    if not TSLIB.is_dir():
        raise FileNotFoundError(f"Time-Series-Library checkout not found: {TSLIB}")
    sys.path.insert(0, str(TSLIB))
    try:
        from models.DLinear import Model as DLinear
        from models.PatchTST import Model as PatchTST
        from models.iTransformer import Model as iTransformer
        from models.TimesNet import Model as TimesNet
    except ModuleNotFoundError as error:
        raise RuntimeError(
            "Install the Time-Series-Library requirements before this run; "
            f"a model dependency is missing: {error.name}"
        ) from error
    return {
        "DLinear": DLinear,
        "PatchTST": PatchTST,
        "iTransformer": iTransformer,
        "TimesNet": TimesNet,
    }


def model_config(task: str, channels: int) -> SimpleNamespace:
    pred_len = HORIZON if task == "forecast" else 0
    return SimpleNamespace(
        task_name="long_term_forecast" if task == "forecast" else "imputation",
        seq_len=LOOKBACK,
        pred_len=pred_len,
        moving_avg=MOVING_AVERAGE,
        enc_in=channels,
        dec_in=channels,
        c_out=channels,
        label_len=48,
        d_model=32,
        d_ff=64,
        e_layers=2,
        n_heads=4,
        factor=1,
        dropout=0.05,
        fc_dropout=0.05,
        head_dropout=0.05,
        patch_len=16,
        stride=8,
        padding_patch="end",
        revin=1,
        affine=0,
        subtract_last=0,
        activation="gelu",
        embed="timeF",
        freq="h",
        top_k=3,
        num_kernels=3,
        individual=False,
    )


def construct_model(model_class, config, model_name: str):
    if model_name == "DLinear":
        return model_class(config, individual=False).cpu()
    return model_class(config).cpu()


def make_time_marks(timestamps: list[datetime]) -> np.ndarray:
    """TSLib hourly timeF marks: month, day, weekday, and hour scaled to [-.5,.5]."""
    return np.asarray(
        [
            [
                (stamp.month - 1) / 11 - 0.5,
                (stamp.day - 1) / 30 - 0.5,
                stamp.weekday() / 6 - 0.5,
                stamp.hour / 23 - 0.5,
            ]
            for stamp in timestamps
        ],
        dtype=np.float32,
    )


def build_windows(
    values: np.ndarray,
    marks: np.ndarray,
    starts: range,
    target_length: int,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    inputs, labels, input_marks = [], [], []
    for target_start in starts:
        inputs.append(values[target_start - LOOKBACK : target_start])
        input_marks.append(marks[target_start - LOOKBACK : target_start])
        if target_length:
            labels.append(values[target_start : target_start + target_length])
    if not inputs:
        raise ValueError("Selected split does not contain complete model windows.")
    y = np.asarray(labels, dtype=np.float32) if labels else np.zeros((len(inputs), 0, values.shape[1]), dtype=np.float32)
    return np.asarray(inputs, dtype=np.float32), y, np.asarray(input_marks, dtype=np.float32)


def batches_for_forecast(x, y, x_mark):
    return DataLoader(
        TensorDataset(torch.from_numpy(x), torch.from_numpy(x_mark), torch.from_numpy(y)),
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=0,
        generator=torch.Generator().manual_seed(SEED),
    )


def forecast_score(model, x: torch.Tensor, mark: torch.Tensor, y: torch.Tensor | None = None) -> torch.Tensor:
    prediction = model(x, mark, None, None)
    return prediction if y is None else prediction[:, -HORIZON:, :]


def train_forecaster(
    model,
    train_loader,
    validation_x: torch.Tensor,
    validation_mark: torch.Tensor,
    validation_y: torch.Tensor,
    seed: int,
) -> dict[str, Any]:
    torch.manual_seed(seed)
    np.random.seed(seed)
    random.seed(seed)
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    criterion = nn.MSELoss()
    best_loss = math.inf
    best_state = None
    best_epoch = 0
    patience_used = 0
    history = []
    for epoch in range(1, MAX_EPOCHS + 1):
        model.train()
        losses = []
        for batch_x, batch_mark, batch_y in train_loader:
            optimizer.zero_grad(set_to_none=True)
            prediction = forecast_score(model, batch_x, batch_mark, batch_y)
            loss = criterion(prediction, batch_y)
            loss.backward()
            optimizer.step()
            losses.append(float(loss.detach()))
        model.eval()
        with torch.inference_mode():
            val_prediction = forecast_score(model, validation_x, validation_mark, validation_y)
            val_loss = float(criterion(val_prediction, validation_y))
        train_loss = float(np.mean(losses))
        history.append({"epoch": epoch, "train_mse_standardized": round(train_loss, 8), "validation_mse_standardized": round(val_loss, 8)})
        if val_loss < best_loss - 1e-8:
            best_loss = val_loss
            best_epoch = epoch
            best_state = {name: tensor.detach().clone() for name, tensor in model.state_dict().items()}
            patience_used = 0
        else:
            patience_used += 1
            if patience_used >= PATIENCE:
                break
    if best_state is None:
        raise RuntimeError("Forecast training did not produce a checkpoint.")
    model.load_state_dict(best_state)
    return {"best_epoch": best_epoch, "stopped_epoch": len(history), "best_validation_mse_standardized": round(best_loss, 8), "history": history, "state_dict": best_state}


def make_imputation_windows(values: np.ndarray, marks: np.ndarray, starts: range):
    x = np.asarray([values[start : start + LOOKBACK] for start in starts], dtype=np.float32)
    m = np.asarray([marks[start : start + LOOKBACK] for start in starts], dtype=np.float32)
    if not len(x):
        raise ValueError("Selected split does not contain imputation windows.")
    return x, m


def make_mask(shape: tuple[int, ...], generator: torch.Generator) -> torch.Tensor:
    return (torch.rand(shape, generator=generator) >= MASK_RATE).to(torch.float32)


def masked_loss(model, x, marks, truth, mask, criterion):
    masked_input = truth.masked_fill(mask == 0, 0)
    prediction = model(masked_input, marks, None, None, mask)
    loss = criterion(prediction[mask == 0], truth[mask == 0])
    return loss, prediction


def imputation_validation(model, x, marks, seed: int) -> float:
    model.eval()
    generator = torch.Generator().manual_seed(seed)
    losses = []
    with torch.inference_mode():
        for start in range(0, len(x), BATCH_SIZE):
            truth = torch.from_numpy(x[start : start + BATCH_SIZE])
            time_mark = torch.from_numpy(marks[start : start + BATCH_SIZE])
            mask = make_mask(tuple(truth.shape), generator)
            loss, _ = masked_loss(model, truth, time_mark, truth, mask, nn.L1Loss())
            losses.append(float(loss))
    return float(np.mean(losses))


def train_imputer(model, train_x, train_marks, validation_x, validation_marks, seed: int) -> dict[str, Any]:
    torch.manual_seed(seed)
    np.random.seed(seed)
    random.seed(seed)
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    criterion = nn.L1Loss()
    generator = torch.Generator().manual_seed(seed)
    best_loss = math.inf
    best_state = None
    best_epoch = 0
    patience_used = 0
    history = []
    for epoch in range(1, MAX_EPOCHS + 1):
        model.train()
        order = torch.randperm(len(train_x), generator=generator)
        losses = []
        for offset in range(0, len(order), BATCH_SIZE):
            ids = order[offset : offset + BATCH_SIZE]
            truth = torch.from_numpy(train_x[ids.numpy()])
            time_mark = torch.from_numpy(train_marks[ids.numpy()])
            mask = make_mask(tuple(truth.shape), generator)
            optimizer.zero_grad(set_to_none=True)
            loss, _ = masked_loss(model, truth, time_mark, truth, mask, criterion)
            loss.backward()
            optimizer.step()
            losses.append(float(loss.detach()))
        val_loss = imputation_validation(model, validation_x, validation_marks, seed + epoch)
        history.append({"epoch": epoch, "train_masked_mae_standardized": round(float(np.mean(losses)), 8), "validation_masked_mae_standardized": round(val_loss, 8)})
        if val_loss < best_loss - 1e-8:
            best_loss = val_loss
            best_epoch = epoch
            best_state = {name: tensor.detach().clone() for name, tensor in model.state_dict().items()}
            patience_used = 0
        else:
            patience_used += 1
            if patience_used >= PATIENCE:
                break
    if best_state is None:
        raise RuntimeError("Imputation training did not produce a checkpoint.")
    model.load_state_dict(best_state)
    return {"best_epoch": best_epoch, "stopped_epoch": len(history), "best_validation_masked_mae_standardized": round(best_loss, 8), "history": history, "state_dict": best_state}


def metrics(actual: np.ndarray, predicted: np.ndarray) -> dict[str, float | int]:
    error = predicted.astype(np.float64) - actual.astype(np.float64)
    return {
        "n": int(len(error)),
        "mae": round(float(np.mean(np.abs(error))), 6),
        "rmse": round(float(np.sqrt(np.mean(error**2))), 6),
        "bias": round(float(np.mean(error)), 6),
    }


def score_forecasts(model, values, marks, mean, scale, split_index):
    predictions, actual = [], []
    origins = []
    model.eval()
    with torch.inference_mode():
        for target_start in range(split_index, len(values) - HORIZON + 1, HORIZON):
            x = torch.from_numpy(values[target_start - LOOKBACK : target_start][None, ...])
            mark = torch.from_numpy(marks[target_start - LOOKBACK : target_start][None, ...])
            prediction = forecast_score(model, x, mark).squeeze(0).numpy()
            predictions.append(prediction * scale + mean)
            actual.append(values[target_start : target_start + HORIZON] * scale + mean)
            origins.append(target_start)
    return np.concatenate(predictions, axis=0), np.concatenate(actual, axis=0), origins


def imputation_eval_windows(split_index: int, total_length: int):
    """Cover every holdout hour once; the final short piece uses a trailing context window."""
    blocks = []
    scored_start = split_index
    while scored_start < total_length:
        scored_end = min(scored_start + LOOKBACK, total_length)
        window_start = scored_start
        if scored_end - scored_start < LOOKBACK:
            window_start = max(split_index, total_length - LOOKBACK)
        blocks.append((window_start, scored_start, scored_end))
        scored_start = scored_end
    return blocks


def score_imputations(model, normalized, marks, mean, scale, mask, split_index):
    prediction_full = np.zeros_like(normalized, dtype=np.float64)
    model.eval()
    with torch.inference_mode():
        for window_start, score_start, score_end in imputation_eval_windows(split_index, len(normalized)):
            window = normalized[window_start : window_start + LOOKBACK].copy()
            window_mask = mask[window_start : window_start + LOOKBACK]
            window[window_mask == 0] = 0
            x = torch.from_numpy(window[None, ...])
            mark = torch.from_numpy(marks[window_start : window_start + LOOKBACK][None, ...])
            mask_t = torch.from_numpy(window_mask[None, ...])
            prediction = model(x, mark, None, None, mask_t).squeeze(0).numpy()
            offset_a, offset_b = score_start - window_start, score_end - window_start
            prediction_full[score_start:score_end] = prediction[offset_a:offset_b] * scale + mean
    return prediction_full


def series_labels(station_series):
    labels = []
    for station_id, targets in station_series.items():
        for target in targets:
            labels.append((station_id, target))
    return labels


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a small forecast and imputation reproduction using TSLib models.")
    parser.add_argument("--input", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--baseline-report", type=Path, default=DEFAULT_BASELINE)
    parser.add_argument("--stage6-report", type=Path, default=DEFAULT_STAGE6)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--artifact-dir", type=Path, default=DEFAULT_ARTIFACTS)
    parser.add_argument("--models", nargs="+", choices=MODEL_NAMES, default=list(MODEL_NAMES))
    args = parser.parse_args()

    stage5 = load_stage5_module()
    if not args.baseline_report.is_file():
        raise FileNotFoundError(f"Stage 5 baseline is missing: {args.baseline_report}")
    timestamps, station_series = stage5.load_public_series(args.input.resolve())
    source_hash = sha256_file(args.input.resolve())
    baseline_report = json.loads(args.baseline_report.read_text(encoding="utf-8"))
    if baseline_report["source"]["sha256"] != source_hash:
        raise ValueError("Baseline and selected source hashes do not match.")
    stage6_report = json.loads(args.stage6_report.read_text(encoding="utf-8")) if args.stage6_report.is_file() else {}
    labels = series_labels(station_series)
    raw = np.asarray([station_series[s][t] for s, t in labels], dtype=np.float64).T
    if not np.isfinite(raw).all():
        raise ValueError("TSLib experiment requires complete finite observations; no imputation is performed here.")

    split_index = int(len(timestamps) * 0.70)
    train_end = int(split_index * 0.80)
    if train_end <= LOOKBACK + HORIZON:
        raise ValueError("Not enough training history for the selected settings.")
    mean = raw[:train_end].mean(axis=0, keepdims=True)
    scale = raw[:train_end].std(axis=0, keepdims=True)
    scale[scale == 0] = 1.0
    normalized = ((raw - mean) / scale).astype(np.float32)
    marks = make_time_marks(timestamps)

    model_classes = import_models()
    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)
    args.artifact_dir.mkdir(parents=True, exist_ok=True)

    report_models: dict[str, Any] = {}
    forecast_results: dict[str, Any] = {}
    imputation_results: dict[str, Any] = {}
    baseline_series = baseline_report["series"]

    train_starts = range(LOOKBACK, train_end - HORIZON + 1)
    val_starts = range(train_end, split_index - HORIZON + 1)
    train_x, train_y, train_marks = build_windows(normalized, marks, train_starts, HORIZON)
    val_x, val_y, val_marks = build_windows(normalized, marks, val_starts, HORIZON)
    forecast_loader = batches_for_forecast(train_x, train_y, train_marks)

    imp_train_x, imp_train_marks = make_imputation_windows(normalized, marks, range(0, train_end - LOOKBACK + 1))
    imp_val_x, imp_val_marks = make_imputation_windows(normalized, marks, range(train_end, split_index - LOOKBACK + 1))

    rng = np.random.default_rng(SEED)
    test_mask = np.ones_like(normalized, dtype=np.float32)
    mask_indices = []
    for channel in range(raw.shape[1]):
        indices = np.arange(split_index, len(raw))
        chosen = rng.choice(indices, size=max(1, round(len(indices) * MASK_RATE)), replace=False)
        test_mask[chosen, channel] = 0.0
        mask_indices.append(chosen.tolist())
    test_mask_t = test_mask

    truth_imputed = raw.copy()
    linear_predictions = np.zeros_like(raw)
    mean_predictions = np.zeros_like(raw)
    score_locations = np.where(test_mask[split_index:] == 0)
    for channel in range(raw.shape[1]):
        masked_positions = mask_indices[channel]
        known = np.ones(len(raw), dtype=bool)
        known[masked_positions] = False
        linear_predictions[:, channel] = np.interp(np.arange(len(raw)), np.where(known)[0], raw[known, channel])
        mean_predictions[:, channel] = float(mean[0, channel])
    target_indices = score_locations[0] + split_index
    target_channels = score_locations[1]
    if not len(target_indices):
        raise RuntimeError("The deterministic imputation mask contains no holdout targets.")

    impute_baselines: dict[str, Any] = {"linear_interpolation": {}, "train_mean": {}}
    for index, (station_id, target) in enumerate(labels):
        unit = baseline_series[station_id][target]["unit"]
        actual = truth_imputed[target_indices, index]
        impute_baselines["linear_interpolation"].setdefault(station_id, {})[target] = {"unit": unit, **metrics(actual[target_channels == index], linear_predictions[target_indices[target_channels == index], index])}
        impute_baselines["train_mean"].setdefault(station_id, {})[target] = {"unit": unit, **metrics(actual[target_channels == index], mean_predictions[target_indices[target_channels == index], index])}

    partial_output = args.output.with_name(args.output.stem + ".partial.json")
    for model_index, name in enumerate(args.models):
        cls = model_classes[name]
        model_seed = SEED + model_index * 100

        torch.manual_seed(model_seed)
        np.random.seed(model_seed)
        random.seed(model_seed)
        forecast_model = construct_model(cls, model_config("forecast", raw.shape[1]), name)
        forecast_training = train_forecaster(
            forecast_model,
            forecast_loader,
            torch.from_numpy(val_x),
            torch.from_numpy(val_marks),
            torch.from_numpy(val_y),
            model_seed,
        )
        predicted, actual, origins = score_forecasts(forecast_model, normalized, marks, mean, scale, split_index)
        feature_metrics: dict[str, Any] = {}
        normalized_maes: list[float] = []
        normalized_rmses: list[float] = []
        for station_id, target in labels:
            offset = labels.index((station_id, target))
            metric = metrics(actual[:, offset], predicted[:, offset])
            normalized_mae = metric["mae"] / float(scale[0, offset])
            normalized_rmse = metric["rmse"] / float(scale[0, offset])
            normalized_maes.append(normalized_mae)
            normalized_rmses.append(normalized_rmse)
            unit = baseline_series[station_id][target]["unit"]
            base = {row["name"]: row["metrics"] for row in baseline_series[station_id][target]["backtest"]["models"]}
            uni_dlinear = stage6_report.get("models", {}).get(station_id, {}).get(target, {}).get("evaluation", {}).get("metrics")
            feature_metrics.setdefault(station_id, {})[target] = {
                "unit": unit,
                "metrics": metric,
                "normalized_mae": round(normalized_mae, 6),
                "normalized_rmse": round(normalized_rmse, 6),
                "comparison_to_persistence": {
                    "mae_change_percent": round((metric["mae"] / base["persistence"]["mae"] - 1) * 100, 4),
                    "rmse_change_percent": round((metric["rmse"] / base["persistence"]["rmse"] - 1) * 100, 4),
                },
                "comparison_to_daily_seasonal_naive": {
                    "mae_change_percent": round((metric["mae"] / base["daily_seasonal_naive_24h"]["mae"] - 1) * 100, 4),
                    "rmse_change_percent": round((metric["rmse"] / base["daily_seasonal_naive_24h"]["rmse"] - 1) * 100, 4),
                },
                "comparison_to_stage6_univariate_dlinear": None if not uni_dlinear else {
                    "mae_change_percent": round((metric["mae"] / uni_dlinear["mae"] - 1) * 100, 4),
                    "rmse_change_percent": round((metric["rmse"] / uni_dlinear["rmse"] - 1) * 100, 4),
                },
            }
        forecast_results[name] = {
            "training": {key: value for key, value in forecast_training.items() if key not in ("state_dict",)},
            "origin_count": len(origins),
            "scored_points_per_series": int(len(predicted)),
            "macro_average_normalized_mae": round(float(np.mean(normalized_maes)), 6),
            "macro_average_normalized_rmse": round(float(np.mean(normalized_rmses)), 6),
            "metrics_by_series": feature_metrics,
        }
        forecast_artifact = args.artifact_dir / f"{name.lower()}-forecast.pt"
        torch.save({"state_dict": forecast_training["state_dict"], "model": name, "task": "forecast", "normalization_mean": mean, "normalization_scale": scale, "seq_len": LOOKBACK, "pred_len": HORIZON}, forecast_artifact)

        torch.manual_seed(model_seed + 1)
        np.random.seed(model_seed + 1)
        random.seed(model_seed + 1)
        impute_model = construct_model(cls, model_config("imputation", raw.shape[1]), name)
        imputation_training = train_imputer(impute_model, imp_train_x, imp_train_marks, imp_val_x, imp_val_marks, model_seed + 1)
        predicted_imputation = score_imputations(impute_model, normalized, marks, mean, scale, test_mask_t, split_index)
        feature_metrics = {}
        normalized_maes = []
        for index, (station_id, target) in enumerate(labels):
            selection = target_channels == index
            predictions = predicted_imputation[target_indices[selection], index]
            actual_values = truth_imputed[target_indices[selection], index]
            unit = baseline_series[station_id][target]["unit"]
            normalized_mae = float(np.mean(np.abs(predictions - actual_values)) / float(scale[0, index]))
            normalized_maes.append(normalized_mae)
            feature_metrics.setdefault(station_id, {})[target] = {
                "unit": unit,
                "metrics": metrics(actual_values, predictions),
                "normalized_mae": round(normalized_mae, 6),
                "masked_points": int(selection.sum()),
                "linear_interpolation": impute_baselines["linear_interpolation"][station_id][target],
                "train_mean": impute_baselines["train_mean"][station_id][target],
            }
        imputation_results[name] = {
            "seed": model_seed + 1,
            "training": {key: value for key, value in imputation_training.items() if key not in ("state_dict",)},
            "mask_rate": MASK_RATE,
            "masking": "MCAR point masks; fixed deterministic holdout masks shared by all models",
            "macro_average_normalized_mae": round(float(np.mean(normalized_maes)), 6),
            "metrics_by_series": feature_metrics,
        }
        impute_artifact = args.artifact_dir / f"{name.lower()}-imputation.pt"
        torch.save({"state_dict": imputation_training["state_dict"], "model": name, "task": "imputation", "normalization_mean": mean, "normalization_scale": scale, "seq_len": LOOKBACK, "mask_rate": MASK_RATE}, impute_artifact)
        report_models[name] = {
            "forecast_artifact": {"filename": forecast_artifact.name, "sha256": sha256_file(forecast_artifact)},
            "imputation_artifact": {"filename": impute_artifact.name, "sha256": sha256_file(impute_artifact)},
        }
        partial_output.parent.mkdir(parents=True, exist_ok=True)
        partial_report = {
            "stage": "tslib-current-data-reproduction-partial",
            "completed_models": list(forecast_results),
            "forecast_models": forecast_results,
            "imputation_models": imputation_results,
            "model_artifacts": report_models,
            "source_sha256": source_hash,
        }
        partial_output.write_text(json.dumps(partial_report, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
        print(f"Completed {name}: forecast best epoch {forecast_training['best_epoch']}, imputation best epoch {imputation_training['best_epoch']}", flush=True)

    try:
        tslib_commit = subprocess.run(["git", "-C", str(TSLIB), "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        tslib_commit = None
    report = {
        "schema_version": 1,
        "stage": "tslib-current-data-reproduction",
        "classification": "offline_adapted_research_experiment",
        "source": {
            "filename": args.input.name,
            "sha256": source_hash,
            "stations": list(station_series),
            "series": [f"{station}/{target}" for station, target in labels],
            "window_local": baseline_report["source"]["window_local"],
            "salinity_unit": "mg/L (source g/L multiplied by 1000)",
            "water_level_unit": "m",
        },
        "library": {
            "name": "Time-Series-Library",
            "repository_commit": tslib_commit,
            "model_source_sha256": {name: sha256_file(TSLIB / "models" / f"{name}.py") for name in args.models},
        },
        "protocol": {
            "tasks": ["24-hour multivariate forecasting", "random point imputation"],
            "lookback_hours": LOOKBACK,
            "forecast_horizon_hours": HORIZON,
            "outer_initial_history_fraction": 0.70,
            "inner_training_fraction_of_initial_history": 0.80,
            "inner_training_end_at": timestamps[train_end - 1].isoformat(),
            "validation_end_at": timestamps[split_index - 1].isoformat(),
            "holdout_start_at": timestamps[split_index].isoformat(),
            "forecast_origins": "non-overlapping 24-hour origins; new observations enter context after each completed block",
            "normalization": "per-channel mean and standard deviation fitted only on inner training history",
            "missing_source_values": "none in the selected public window; no source filling or interpolation",
            "imputation_mask_rate": MASK_RATE,
            "imputation_masks": "deterministic MCAR point masks, shared between models; scored only at masked holdout values",
            "optimizer": "Adam",
            "learning_rate": LEARNING_RATE,
            "batch_size": BATCH_SIZE,
            "maximum_epochs": MAX_EPOCHS,
            "early_stopping_patience": PATIENCE,
            "forecast_loss": "MSE on standardized targets",
            "imputation_loss": "MAE on masked standardized targets",
            "seed": SEED,
            "device": "cpu",
        },
        "forecast_models": forecast_results,
        "imputation_models": imputation_results,
        "model_artifacts": report_models,
        "decision": {
            "forecast_api_enabled": False,
            "database_accessed": False,
            "forecast_rows_written": False,
            "eligible_for_public_api": False,
            "reason": "one short June-July holdout; no independent-season validation or owner-approved quality thresholds",
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    report["runner_sha256"] = sha256_file(Path(__file__).resolve())
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    partial_output.unlink(missing_ok=True)
    print(json.dumps({"report": str(args.output), "source_sha256": source_hash, "forecast_models": list(forecast_results), "imputation_models": list(imputation_results), "forecast_api_enabled": False, "database_accessed": False}, ensure_ascii=False))


if __name__ == "__main__":
    main()
