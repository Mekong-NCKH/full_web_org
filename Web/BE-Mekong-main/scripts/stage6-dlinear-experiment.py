#!/usr/bin/env python3
"""Train and evaluate TSLib DLinear against the Stage 5 baselines.

The experiment is local and offline. It reads the selected CSV and baseline
report, writes model artifacts and a report, and never connects to Neon.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
import random
import sys
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

sys.dont_write_bytecode = True


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
SCRIPT_DIR = Path(__file__).resolve().parent
TSLIB_ROOT = REPOSITORY_ROOT / "Time-Series-Library"
DEFAULT_SOURCE = REPOSITORY_ROOT / "Sanility_GIS_Monitoring" / "BaoDinh.csv"
DEFAULT_BASELINE_REPORT = (
    REPOSITORY_ROOT
    / "Web"
    / "BE-Mekong-main"
    / "reports"
    / "stage5-forecast-baseline.json"
)
DEFAULT_REPORT = (
    REPOSITORY_ROOT
    / "Web"
    / "BE-Mekong-main"
    / "reports"
    / "stage6-dlinear-experiment.json"
)
DEFAULT_ARTIFACT_DIR = (
    REPOSITORY_ROOT
    / "Web"
    / "BE-Mekong-main"
    / "reports"
    / "stage6-artifacts"
)

SEED = 42
SEQUENCE_LENGTH = 96
HORIZON_HOURS = 24
MOVING_AVERAGE = 25
TRAIN_FRACTION = 0.70
TRAIN_WITHIN_INITIAL_HISTORY = 0.80
BATCH_SIZE = 32
LEARNING_RATE = 0.001
MAX_EPOCHS = 100
EARLY_STOPPING_PATIENCE = 7


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_stage5_module():
    path = SCRIPT_DIR / "stage5-forecast-baseline.py"
    spec = importlib.util.spec_from_file_location("stage5_forecast_baseline", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load Stage 5 data contract from {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_dlinear_model():
    model_file = TSLIB_ROOT / "models" / "DLinear.py"
    decomposition_file = TSLIB_ROOT / "layers" / "Autoformer_EncDec.py"
    if not model_file.is_file() or not decomposition_file.is_file():
        raise FileNotFoundError("The expected Time-Series-Library DLinear files are missing.")

    sys.path.insert(0, str(TSLIB_ROOT))
    from models.DLinear import Model

    return Model, model_file, decomposition_file


def make_windows(
    values: np.ndarray,
    target_starts: range,
    mean: float,
    scale: float,
) -> tuple[np.ndarray, np.ndarray]:
    inputs: list[np.ndarray] = []
    targets: list[np.ndarray] = []
    for target_start in target_starts:
        inputs.append(
            (values[target_start - SEQUENCE_LENGTH : target_start] - mean) / scale
        )
        targets.append(
            (values[target_start : target_start + HORIZON_HOURS] - mean) / scale
        )
    if not inputs:
        raise ValueError("Not enough contiguous history to create model windows.")
    x = np.asarray(inputs, dtype=np.float32)[..., np.newaxis]
    y = np.asarray(targets, dtype=np.float32)[..., np.newaxis]
    return x, y


def make_model(model_class, task_name: str = "long_term_forecast"):
    config = SimpleNamespace(
        task_name=task_name,
        seq_len=SEQUENCE_LENGTH,
        pred_len=HORIZON_HOURS,
        moving_avg=MOVING_AVERAGE,
        enc_in=1,
    )
    return model_class(config, individual=False)


def compare_metrics(
    model_metrics: dict[str, Any], baseline_metrics: dict[str, Any]
) -> dict[str, Any]:
    return {
        "mae_improved": model_metrics["mae"] < baseline_metrics["mae"],
        "rmse_improved": model_metrics["rmse"] < baseline_metrics["rmse"],
        "absolute_bias_improved": abs(model_metrics["bias"])
        < abs(baseline_metrics["bias"]),
        "mae_change_percent": round(
            (model_metrics["mae"] / baseline_metrics["mae"] - 1) * 100, 4
        ),
        "rmse_change_percent": round(
            (model_metrics["rmse"] / baseline_metrics["rmse"] - 1) * 100, 4
        ),
        "bias_delta": round(
            model_metrics["bias"] - baseline_metrics["bias"], 6
        ),
    }


def train_one_series(
    model_class,
    values_list: list[float | None],
    station_id: str,
    target: str,
    seed: int,
    artifact_dir: Path,
    split_index: int,
    train_end_index: int,
    timestamps: list[Any],
) -> dict[str, Any]:
    if any(value is None for value in values_list):
        raise ValueError(
            f"{station_id}/{target} contains nulls. Stage 6 does not silently impute."
        )
    values = np.asarray(values_list, dtype=np.float64)
    if not np.isfinite(values).all():
        raise ValueError(f"{station_id}/{target} contains non-finite values.")

    train_values = values[:train_end_index]
    mean = float(train_values.mean())
    raw_scale = float(train_values.std())
    scale = raw_scale if raw_scale > 0 else 1.0

    train_starts = range(
        SEQUENCE_LENGTH,
        train_end_index - HORIZON_HOURS + 1,
    )
    val_starts = range(
        train_end_index,
        split_index - HORIZON_HOURS + 1,
    )
    train_x, train_y = make_windows(values, train_starts, mean, scale)
    val_x, val_y = make_windows(values, val_starts, mean, scale)

    torch.manual_seed(seed)
    np.random.seed(seed)
    random.seed(seed)
    model = make_model(model_class).cpu()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    loss_function = nn.MSELoss()
    generator = torch.Generator().manual_seed(seed)
    training_loader = DataLoader(
        TensorDataset(torch.from_numpy(train_x), torch.from_numpy(train_y)),
        batch_size=BATCH_SIZE,
        shuffle=True,
        generator=generator,
        num_workers=0,
    )
    val_inputs = torch.from_numpy(val_x)
    val_targets = torch.from_numpy(val_y)

    best_val_loss = math.inf
    best_epoch = 0
    best_state: dict[str, torch.Tensor] | None = None
    epochs_without_improvement = 0
    history: list[dict[str, float | int]] = []

    for epoch in range(1, MAX_EPOCHS + 1):
        model.train()
        weighted_train_loss = 0.0
        seen_train_rows = 0
        gradient_norm_sum = 0.0
        gradient_batches = 0
        nonzero_gradient_batches = 0

        for batch_x, batch_y in training_loader:
            optimizer.zero_grad(set_to_none=True)
            prediction = model(batch_x, None, None, None)
            loss = loss_function(prediction, batch_y)
            loss.backward()

            squared_norm = sum(
                float(torch.sum(parameter.grad.detach() ** 2).item())
                for parameter in model.parameters()
                if parameter.grad is not None
            )
            gradient_norm = math.sqrt(squared_norm)
            gradient_norm_sum += gradient_norm
            gradient_batches += 1
            if gradient_norm > 0:
                nonzero_gradient_batches += 1

            optimizer.step()
            batch_rows = batch_x.shape[0]
            weighted_train_loss += float(loss.detach().item()) * batch_rows
            seen_train_rows += batch_rows

        model.eval()
        with torch.inference_mode():
            val_prediction = model(val_inputs, None, None, None)
            val_loss = float(loss_function(val_prediction, val_targets).item())

        train_loss = weighted_train_loss / seen_train_rows
        history.append(
            {
                "epoch": epoch,
                "train_mse_standardized": round(train_loss, 10),
                "validation_mse_standardized": round(val_loss, 10),
                "mean_gradient_l2_norm": round(
                    gradient_norm_sum / max(gradient_batches, 1), 10
                ),
                "nonzero_gradient_batches": nonzero_gradient_batches,
            }
        )

        if val_loss < best_val_loss - 1e-10:
            best_val_loss = val_loss
            best_epoch = epoch
            best_state = {
                name: tensor.detach().cpu().clone()
                for name, tensor in model.state_dict().items()
            }
            epochs_without_improvement = 0
        else:
            epochs_without_improvement += 1
            if epochs_without_improvement >= EARLY_STOPPING_PATIENCE:
                break

    if best_state is None:
        raise RuntimeError(f"No validation checkpoint was produced for {station_id}/{target}.")
    model.load_state_dict(best_state)
    model.eval()

    prediction_errors: list[float] = []
    prediction_points: list[dict[str, Any]] = []
    origin_count = 0
    with torch.inference_mode():
        for target_start in range(
            split_index,
            len(values) - HORIZON_HOURS + 1,
            HORIZON_HOURS,
        ):
            origin_index = target_start - 1
            history_values = values[
                target_start - SEQUENCE_LENGTH : target_start
            ]
            model_input = torch.from_numpy(
                ((history_values - mean) / scale)
                .astype(np.float32)
                .reshape(1, SEQUENCE_LENGTH, 1)
            )
            normalized_prediction = model(model_input, None, None, None)
            predicted = (
                normalized_prediction.squeeze(0).squeeze(-1).numpy() * scale
                + mean
            )
            actual = values[target_start : target_start + HORIZON_HOURS]
            prediction_errors.extend(
                float(predicted[index] - actual[index])
                for index in range(HORIZON_HOURS)
            )
            prediction_points.append(
                {
                    "origin_at": timestamps[origin_index].isoformat(),
                    "target_from": timestamps[target_start].isoformat(),
                    "target_to": timestamps[
                        target_start + HORIZON_HOURS - 1
                    ].isoformat(),
                }
            )
            origin_count += 1

    artifact_name = f"{station_id}-{target}-dlinear-v1.pt"
    artifact_path = artifact_dir / artifact_name
    artifact_dir.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "state_dict": best_state,
            "normalization": {"mean": mean, "scale": scale},
            "model_configuration": {
                "model": "DLinear",
                "task_name": "long_term_forecast",
                "seq_len": SEQUENCE_LENGTH,
                "pred_len": HORIZON_HOURS,
                "moving_avg": MOVING_AVERAGE,
                "enc_in": 1,
                "individual": False,
            },
            "training": {
                "seed": seed,
                "best_epoch": best_epoch,
                "max_epochs": MAX_EPOCHS,
                "batch_size": BATCH_SIZE,
                "learning_rate": LEARNING_RATE,
                "loss": "MSE",
                "optimizer": "Adam",
            },
        },
        artifact_path,
    )

    return {
        "status": "experimental",
        "seed": seed,
        "training_windows": len(train_x),
        "validation_windows": len(val_x),
        "training_boundary_at": timestamps[train_end_index - 1].isoformat(),
        "holdout_boundary_at": timestamps[split_index].isoformat(),
        "best_epoch": best_epoch,
        "stopped_at_epoch": len(history),
        "stopping_reason": (
            "early_stopping" if len(history) < MAX_EPOCHS else "maximum_epochs_reached"
        ),
        "best_validation_mse_standardized": round(best_val_loss, 10),
        "training_history": history,
        "gradient_record": {
            "nonzero_gradient_batches_observed": sum(
                row["nonzero_gradient_batches"] for row in history
            ),
            "epochs_recorded": len(history),
        },
        "evaluation": {
            "origin_count": origin_count,
            "horizon_hours": HORIZON_HOURS,
            "scored_points": len(prediction_errors),
            "first_origin_at": prediction_points[0]["origin_at"],
            "last_target_at": prediction_points[-1]["target_to"],
            "metrics": load_stage5_module().calculate_metrics(prediction_errors),
        },
        "artifact": {
            "filename": artifact_name,
            "sha256": sha256_file(artifact_path),
            "normalization_mean": mean,
            "normalization_scale": scale,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train TSLib DLinear models on the approved historical window."
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--baseline-report", type=Path, default=DEFAULT_BASELINE_REPORT)
    parser.add_argument("--output", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--artifact-dir", type=Path, default=DEFAULT_ARTIFACT_DIR)
    args = parser.parse_args()

    if not TSLIB_ROOT.is_dir():
        raise FileNotFoundError(f"Time-Series-Library directory not found: {TSLIB_ROOT}")
    if not args.baseline_report.is_file():
        raise FileNotFoundError(
            "Stage 5 baseline report is missing. Run the Stage 5 backtest first."
        )

    stage5 = load_stage5_module()
    timestamps, station_series = stage5.load_public_series(args.input.resolve())
    source_hash = sha256_file(args.input.resolve())
    baseline_report = json.loads(
        args.baseline_report.read_text(encoding="utf-8")
    )
    if baseline_report["source"]["sha256"] != source_hash:
        raise ValueError(
            "The Stage 5 baseline report source hash does not match the selected CSV."
        )

    split_index = int(len(timestamps) * TRAIN_FRACTION)
    train_end_index = int(
        split_index * TRAIN_WITHIN_INITIAL_HISTORY
    )
    if train_end_index <= SEQUENCE_LENGTH + HORIZON_HOURS:
        raise ValueError("Not enough training history for the selected model configuration.")

    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)
    model_class, model_file, decomposition_file = load_dlinear_model()
    models: dict[str, Any] = {}
    for station_index, (station_id, targets) in enumerate(station_series.items()):
        models[station_id] = {}
        for target_index, (target, values) in enumerate(targets.items()):
            key = f"{station_id}/{target}"
            seed = SEED + station_index * 10 + target_index
            result = train_one_series(
                model_class=model_class,
                values_list=values,
                station_id=station_id,
                target=target,
                seed=seed,
                artifact_dir=args.artifact_dir,
                split_index=split_index,
                train_end_index=train_end_index,
                timestamps=timestamps,
            )
            baseline_models = {
                model["name"]: model["metrics"]
                for model in baseline_report["series"][station_id][target][
                    "backtest"
                ]["models"]
            }
            dlinear_metrics = result["evaluation"]["metrics"]
            result["comparisons"] = {
                baseline_name: compare_metrics(
                    dlinear_metrics,
                    baseline_models[baseline_name],
                )
                for baseline_name in (
                    "persistence",
                    "daily_seasonal_naive_24h",
                )
            }
            models[station_id][target] = result

    model_file_hash = sha256_file(model_file)
    decomposition_file_hash = sha256_file(decomposition_file)
    report = {
        "schema_version": 1,
        "stage": "stage6-tslib-dlinear-experiment",
        "classification": "offline_research_experiment",
        "source": {
            "filename": args.input.name,
            "sha256": source_hash,
            "stations": list(station_series),
            "window_local": baseline_report["source"]["window_local"],
        },
        "implementation": {
            "library": "Time-Series-Library",
            "model": "DLinear",
            "model_source_sha256": model_file_hash,
            "decomposition_source_sha256": decomposition_file_hash,
            "runner": Path(__file__).name,
            "runner_sha256": sha256_file(Path(__file__).resolve()),
        },
        "protocol": {
            "lookback_hours": SEQUENCE_LENGTH,
            "horizon_hours": HORIZON_HOURS,
            "outer_initial_history_fraction": TRAIN_FRACTION,
            "inner_training_fraction_of_initial_history": TRAIN_WITHIN_INITIAL_HISTORY,
            "inner_training_end_at": timestamps[train_end_index - 1].isoformat(),
            "validation_end_at": timestamps[split_index - 1].isoformat(),
            "holdout_start_at": timestamps[split_index].isoformat(),
            "evaluation_origins": "Non-overlapping 24-hour rolling origins; observed history updates between origins.",
            "test_boundary_matches_stage5": True,
            "normalization": "Mean and standard deviation fitted only on the inner training segment.",
            "missing_values": "No imputation; run fails if a selected target contains a missing value.",
            "optimizer": "Adam",
            "learning_rate": LEARNING_RATE,
            "loss": "MSE on standardized training targets",
            "batch_size": BATCH_SIZE,
            "maximum_epochs": MAX_EPOCHS,
            "early_stopping_patience": EARLY_STOPPING_PATIENCE,
            "seed_policy": "42 + station_index * 10 + target_index",
            "device": "cpu",
        },
        "models": models,
        "decision": {
            "forecast_api_enabled": False,
            "model_versions_registered": False,
            "forecast_rows_written": False,
            "database_accessed": False,
            "reason": (
                "This is one experimental chronological holdout. "
                "A trained checkpoint is not automatically a validated or "
                "operational model."
            ),
        },
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    summary = {
        station_id: {
            target: {
                "mae": details["evaluation"]["metrics"]["mae"],
                "rmse": details["evaluation"]["metrics"]["rmse"],
                "comparisons": details["comparisons"],
                "artifact_sha256": details["artifact"]["sha256"],
            }
            for target, details in targets.items()
        }
        for station_id, targets in models.items()
    }
    print(
        json.dumps(
            {
                "report": str(args.output),
                "summary": summary,
                "forecastApiEnabled": False,
                "databaseAccessed": False,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
