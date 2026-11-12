#!/usr/bin/env python3
"""Summarize normalized errors and draw the reproduction comparison figure."""

from __future__ import annotations

import csv
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np

try:
    import matplotlib.pyplot as plt
except ModuleNotFoundError:
    plt = None

ROOT = Path(__file__).resolve().parents[2]
REPORT_DIR = ROOT / "Web" / "BE-Mekong-main" / "reports"
RESULT_DIR = ROOT / "research_reproduction" / "results" / "tslib"
BENCHMARK = RESULT_DIR / "benchmark.json"
SUMMARY_CSV = RESULT_DIR / "summary.csv"
FIGURE = RESULT_DIR / "benchmark_summary.png"
sys.dont_write_bytecode = True


def load_stage5_module():
    path = ROOT / "Web" / "BE-Mekong-main" / "scripts" / "stage5-forecast-baseline.py"
    spec = importlib.util.spec_from_file_location("stage5_contract", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load the approved-source contract.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> None:
    report = json.loads(BENCHMARK.read_text(encoding="utf-8"))
    baseline = json.loads((REPORT_DIR / "stage5-forecast-baseline.json").read_text(encoding="utf-8"))
    stage6 = json.loads((REPORT_DIR / "stage6-dlinear-experiment.json").read_text(encoding="utf-8"))
    stage5 = load_stage5_module()
    timestamps, station_series = stage5.load_public_series(ROOT / "Sanility_GIS_Monitoring" / "BaoDinh.csv")
    labels = [(station, target) for station, targets in station_series.items() for target in targets]
    raw = np.asarray([[station_series[s][t][i] for s, t in labels] for i in range(len(timestamps))], dtype=np.float64)
    split = int(len(timestamps) * 0.70)
    train_end = int(split * 0.80)
    scales = raw[:train_end].std(axis=0)
    scales[scales == 0] = 1.0

    forecast_rows: list[dict[str, float | str]] = []
    for baseline_name, label in (("persistence", "Persistence"), ("daily_seasonal_naive_24h", "Daily seasonal naive")):
        nmae, nrmse = [], []
        for i, (station, target) in enumerate(labels):
            metrics = next(
                model["metrics"]
                for model in baseline["series"][station][target]["backtest"]["models"]
                if model["name"] == baseline_name
            )
            nmae.append(metrics["mae"] / scales[i])
            nrmse.append(metrics["rmse"] / scales[i])
        forecast_rows.append({"task": "forecast_24h", "model": label, "normalized_mae": float(np.mean(nmae)), "normalized_rmse": float(np.mean(nrmse))})

    nmae, nrmse = [], []
    for i, (station, target) in enumerate(labels):
        metric = stage6["models"][station][target]["evaluation"]["metrics"]
        nmae.append(metric["mae"] / scales[i])
        nrmse.append(metric["rmse"] / scales[i])
    forecast_rows.append({"task": "forecast_24h", "model": "DLinear univariate", "normalized_mae": float(np.mean(nmae)), "normalized_rmse": float(np.mean(nrmse))})
    for name, model in report["forecast_models"].items():
        forecast_rows.append({"task": "forecast_24h", "model": name, "normalized_mae": model["macro_average_normalized_mae"], "normalized_rmse": model["macro_average_normalized_rmse"]})

    imputation_rows: list[dict[str, float | str]] = []
    reference = report["imputation_models"]["DLinear"]["metrics_by_series"]
    for baseline_name, label in (("train_mean", "Training mean"), ("linear_interpolation", "Linear interpolation")):
        nmae, nrmse = [], []
        for i, (station, target) in enumerate(labels):
            metric = reference[station][target][baseline_name]
            nmae.append(metric["mae"] / scales[i])
            nrmse.append(metric["rmse"] / scales[i])
        imputation_rows.append({"task": "point_imputation_25pct", "model": label, "normalized_mae": float(np.mean(nmae)), "normalized_rmse": float(np.mean(nrmse))})
    for name, model in report["imputation_models"].items():
        nmae, nrmse = [], []
        for i, (station, target) in enumerate(labels):
            metric = model["metrics_by_series"][station][target]["metrics"]
            nmae.append(metric["mae"] / scales[i])
            nrmse.append(metric["rmse"] / scales[i])
        imputation_rows.append({"task": "point_imputation_25pct", "model": name, "normalized_mae": float(np.mean(nmae)), "normalized_rmse": float(np.mean(nrmse))})

    rows = forecast_rows + imputation_rows
    with SUMMARY_CSV.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=["task", "model", "normalized_mae", "normalized_rmse"])
        writer.writeheader()
        for row in rows:
            writer.writerow({**row, "normalized_mae": round(float(row["normalized_mae"]), 6), "normalized_rmse": round(float(row["normalized_rmse"]), 6)})

    figure_path = None
    if plt is not None:
        plt.rcParams.update({"font.size": 10, "axes.titlesize": 12, "axes.labelsize": 10, "figure.dpi": 160})
        fig, axes = plt.subplots(1, 2, figsize=(12.8, 5.5))
        panels = [
            (axes[0], forecast_rows, "24-hour forecast", "Non-overlapping origins, 432 hours scored per series"),
            (axes[1], imputation_rows, "Point imputation", "25% MCAR mask, same hidden holdout points for all models"),
        ]
        baseline_names = {"Persistence", "Daily seasonal naive", "DLinear univariate", "Training mean", "Linear interpolation"}
        for ax, panel_rows, title, subtitle in panels:
            ordered = sorted(panel_rows, key=lambda item: float(item["normalized_mae"]))
            names = [str(item["model"]) for item in ordered]
            values = [float(item["normalized_mae"]) for item in ordered]
            colors = ["#9AA6B2" if name in baseline_names else "#2878B5" for name in names]
            positions = np.arange(len(names))
            ax.barh(positions, values, color=colors, height=0.68)
            ax.set_yticks(positions, labels=names)
            ax.invert_yaxis()
            ax.set_xlabel("MAE / training standard deviation (lower is better)")
            ax.set_title(title, loc="left", weight="bold", pad=22)
            ax.text(0, 1.02, subtitle, transform=ax.transAxes, fontsize=8.5, color="#52606D")
            ax.grid(axis="x", linestyle=":", alpha=0.4)
            ax.set_axisbelow(True)
            for y, value in enumerate(values):
                ax.text(value + 0.01, y, f"{value:.3f}", va="center", fontsize=8)
            ax.spines[["top", "right", "left"]].set_visible(False)
        fig.suptitle("Mekong public-window TSLib reproduction", x=0.04, ha="left", weight="bold", fontsize=14)
        fig.tight_layout(rect=(0, 0, 1, 0.92), w_pad=2.0)
        fig.savefig(FIGURE, dpi=300, bbox_inches="tight")
        plt.close(fig)
        figure_path = str(FIGURE)
    print(json.dumps({"summary_csv": str(SUMMARY_CSV), "figure": figure_path, "forecast_rows": len(forecast_rows), "imputation_rows": len(imputation_rows)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
