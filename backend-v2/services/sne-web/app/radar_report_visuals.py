"""
Visual renderer for operational Radar reports.

This uses the mature beta chart direction: real candlesticks, EMAs,
Bollinger bands, volume and operational levels. The surrounding layout is a
HALO distribution card instead of a raw dashboard export.
"""

from __future__ import annotations

from io import BytesIO
from typing import Any, Dict, List, Tuple

import matplotlib

matplotlib.use("Agg")

import matplotlib.patches as patches
import matplotlib.pyplot as plt
import mplfinance as mpf
import pandas as pd
from matplotlib.transforms import blended_transform_factory

from .radar_report_service import _fetch_candles


BG = "#080b0f"
PANEL = "#10161d"
PANEL_ALT = "#0d131a"
GRID = "#25313b"
TEXT = "#e8eef5"
MUTED = "#8c9aa8"
GREEN = "#2ee59d"
RED = "#ff5c7a"
CYAN = "#49d3ff"
YELLOW = "#f4d35e"
ORANGE = "#ff9f43"
AMBER = "#ffb02e"
GRAY = "#5d6b78"


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _fmt_price(value: Any) -> str:
    number = _to_float(value)
    if number >= 100:
        return f"{number:,.2f}"
    if number >= 1:
        return f"{number:,.4f}"
    return f"{number:,.6f}"


def _state_badge(state: str) -> Tuple[str, str]:
    normalized = str(state or "").lower()
    if normalized == "ready":
        return "PRONTO", GREEN
    if normalized == "prepare":
        return "PREPARAR", AMBER
    if normalized == "observe":
        return "OBSERVAR", GRAY
    return normalized.upper() or "OBSERVAR", GRAY


def _desk_bias(bias: str) -> str:
    normalized = str(bias or "").lower()
    if normalized == "alta":
        return "ALTA"
    if normalized == "baixa":
        return "BAIXA"
    if normalized == "lateral":
        return "LATERAL"
    return "NEUTRO"


def _visual_thesis(state: str, bias: str) -> str:
    desk_bias = _desk_bias(bias).lower()
    normalized_state = str(state or "").lower()
    if normalized_state == "ready":
        return f"Setup de {desk_bias} confirmado. Apenas no gatilho."
    if normalized_state == "prepare":
        return f"Viés de {desk_bias}. Sem perseguir preço."
    return "Sem confirmação. Preservar capital."


def _report_parts(report: Dict[str, Any]) -> Dict[str, Any]:
    summary = report.get("executive_summary") or {}
    decision = report.get("operator_decision") or {}
    scenarios = report.get("scenarios") or {}
    risk = report.get("risk_plan") or {}
    return {
        "symbol": str(report.get("symbol") or "BTCUSDT"),
        "timeframe": str(report.get("timeframe") or "1h"),
        "summary": summary,
        "decision": decision,
        "long": scenarios.get("long") or {},
        "short": scenarios.get("short") or {},
        "risk": risk,
    }


def _candles_frame(candles: List[Dict[str, float]]) -> pd.DataFrame:
    frame = pd.DataFrame(candles)
    if frame.empty:
        return frame
    frame["timestamp"] = pd.to_datetime(frame["timestamp"], unit="ms", utc=True)
    frame = frame.set_index("timestamp")
    frame = frame.rename(columns={
        "open": "Open",
        "high": "High",
        "low": "Low",
        "close": "Close",
        "volume": "Volume",
    })
    frame = frame[["Open", "High", "Low", "Close", "Volume"]].astype(float)
    frame["EMA8"] = frame["Close"].ewm(span=8, adjust=False).mean()
    frame["EMA21"] = frame["Close"].ewm(span=21, adjust=False).mean()
    frame["SMA50"] = frame["Close"].rolling(window=50).mean()
    frame["BB_Mid"] = frame["Close"].rolling(window=20).mean()
    bb_std = frame["Close"].rolling(window=20).std()
    frame["BB_Upper"] = frame["BB_Mid"] + (bb_std * 2)
    frame["BB_Lower"] = frame["BB_Mid"] - (bb_std * 2)
    return frame


def _rounded_panel(ax: plt.Axes, xy: Tuple[float, float], width: float, height: float, *, color: str = PANEL) -> None:
    panel = patches.FancyBboxPatch(
        xy,
        width,
        height,
        boxstyle="round,pad=0.014,rounding_size=0.035",
        transform=ax.transAxes,
        linewidth=1.2,
        edgecolor="#1f2a34",
        facecolor=color,
        clip_on=False,
    )
    ax.add_patch(panel)


def _draw_header(ax: plt.Axes, parts: Dict[str, Any]) -> None:
    ax.set_axis_off()
    _rounded_panel(ax, (0.01, 0.08), 0.98, 0.84)
    symbol = parts["symbol"]
    timeframe = parts["timeframe"].upper()
    summary = parts["summary"]
    decision = parts["decision"]
    long_s = parts["long"]
    short_s = parts["short"]
    state = str(decision.get("state") or "observe")
    badge, badge_color = _state_badge(state)
    bias = str(summary.get("bias") or "sem dados")

    ax.text(0.035, 0.73, f"SNE RADAR / {symbol} / {timeframe}", transform=ax.transAxes, color=MUTED, fontsize=18, fontweight="bold")
    ax.text(0.035, 0.39, _visual_thesis(state, bias), transform=ax.transAxes, color=TEXT, fontsize=27, fontweight="bold")
    ax.text(
        0.035,
        0.13,
        f"LONG > {_fmt_price(long_s.get('trigger'))}    SHORT < {_fmt_price(short_s.get('trigger'))}",
        transform=ax.transAxes,
        color=YELLOW,
        fontsize=19,
        fontweight="bold",
    )

    badge_patch = patches.FancyBboxPatch(
        (0.78, 0.48),
        0.17,
        0.3,
        boxstyle="round,pad=0.015,rounding_size=0.035",
        transform=ax.transAxes,
        linewidth=0,
        facecolor=badge_color,
        clip_on=False,
    )
    ax.add_patch(badge_patch)
    ax.text(0.865, 0.625, badge, transform=ax.transAxes, color=BG, fontsize=23, fontweight="bold", ha="center", va="center")


def _draw_metrics(ax: plt.Axes, parts: Dict[str, Any]) -> None:
    ax.set_axis_off()
    _rounded_panel(ax, (0.01, 0.08), 0.98, 0.84, color=PANEL_ALT)
    summary = parts["summary"]
    risk = parts["risk"]
    metrics = [
        ("VIÉS", _desk_bias(str(summary.get("bias") or "")), GREEN if summary.get("bias") == "alta" else RED if summary.get("bias") == "baixa" else TEXT),
        ("CONF", f"{summary.get('confluence_score', 0)}/100", YELLOW),
        ("RSI", str(summary.get("rsi") or "N/A"), TEXT),
        ("VOL", str(summary.get("volume_ratio") or "N/A"), TEXT),
        ("TAM", f"{risk.get('position_size_factor', 'N/A')}x", ORANGE),
        ("RISCO", f"{risk.get('risk_per_trade_pct', 'N/A')}%", ORANGE),
    ]
    for index, (label, value, color) in enumerate(metrics):
        x = 0.035 + index * 0.158
        ax.text(x, 0.61, label, transform=ax.transAxes, color=MUTED, fontsize=12, fontweight="bold")
        ax.text(x, 0.25, value, transform=ax.transAxes, color=color, fontsize=19, fontweight="bold")


def _chart_style() -> Dict[str, Any]:
    market_colors = mpf.make_marketcolors(
        up=GREEN,
        down=RED,
        edge={"up": GREEN, "down": RED},
        wick={"up": GREEN, "down": RED},
        volume={"up": "#1f8f62", "down": "#a83c50"},
        alpha=0.95,
    )
    return mpf.make_mpf_style(
        marketcolors=market_colors,
        gridstyle="-",
        gridcolor=GRID,
        y_on_right=True,
        facecolor="#0b1117",
        figcolor=BG,
        edgecolor="#1f2a34",
        rc={
            "axes.labelcolor": MUTED,
            "axes.edgecolor": "#1f2a34",
            "xtick.color": MUTED,
            "ytick.color": MUTED,
            "text.color": TEXT,
            "font.size": 9,
        },
    )


def _draw_level_label(ax: plt.Axes, price: float, label: str, color: str) -> None:
    transform = blended_transform_factory(ax.transAxes, ax.transData)
    ax.text(
        0.995,
        price,
        f" {label} {_fmt_price(price)} ",
        transform=transform,
        color=BG,
        fontsize=8,
        fontweight="bold",
        ha="right",
        va="center",
        bbox={
            "boxstyle": "round,pad=0.25,rounding_size=0.08",
            "facecolor": color,
            "edgecolor": "none",
            "alpha": 0.92,
        },
        zorder=9,
    )


def _draw_operational_levels(ax: plt.Axes, report: Dict[str, Any]) -> None:
    parts = _report_parts(report)
    levels = report.get("technical", {}).get("levels", {})
    long_s = parts["long"]
    short_s = parts["short"]

    for item in levels.get("supports", [])[:1]:
        price = _to_float(item.get("price"))
        ax.axhline(price, color=GREEN, linestyle=":", linewidth=1.1, alpha=0.55, zorder=2)
    for item in levels.get("resistances", [])[:1]:
        price = _to_float(item.get("price"))
        ax.axhline(price, color=RED, linestyle=":", linewidth=1.1, alpha=0.55, zorder=2)

    if long_s.get("trigger") is not None:
        price = _to_float(long_s.get("trigger"))
        ax.axhline(price, color=GREEN, linewidth=2.0, alpha=0.95, zorder=3)
        _draw_level_label(ax, price, "LONG", GREEN)
    if short_s.get("trigger") is not None:
        price = _to_float(short_s.get("trigger"))
        ax.axhline(price, color=RED, linewidth=2.0, alpha=0.95, zorder=3)
        _draw_level_label(ax, price, "SHORT", RED)
    if long_s.get("tp1") is not None:
        price = _to_float(long_s.get("tp1"))
        ax.axhline(price, color=GREEN, linestyle="--", linewidth=1.2, alpha=0.55, zorder=2)
        _draw_level_label(ax, price, "TP1", GREEN)
    if short_s.get("tp1") is not None:
        price = _to_float(short_s.get("tp1"))
        ax.axhline(price, color=RED, linestyle="--", linewidth=1.2, alpha=0.55, zorder=2)
        _draw_level_label(ax, price, "TP1", RED)


def _draw_footer(ax: plt.Axes, parts: Dict[str, Any]) -> None:
    ax.set_axis_off()
    _rounded_panel(ax, (0.01, 0.08), 0.98, 0.84)
    long_s = parts["long"]
    short_s = parts["short"]
    ax.text(0.035, 0.72, "EXECUÇÃO", transform=ax.transAxes, color=MUTED, fontsize=13, fontweight="bold")
    ax.text(
        0.035,
        0.42,
        f"LONG > {_fmt_price(long_s.get('trigger'))}   TP1 {_fmt_price(long_s.get('tp1'))}",
        transform=ax.transAxes,
        color=GREEN,
        fontsize=25,
        fontweight="bold",
    )
    ax.text(
        0.035,
        0.14,
        f"SHORT < {_fmt_price(short_s.get('trigger'))}   TP1 {_fmt_price(short_s.get('tp1'))}",
        transform=ax.transAxes,
        color=RED,
        fontsize=25,
        fontweight="bold",
    )
    ax.text(0.58, 0.64, "HALO", transform=ax.transAxes, color=MUTED, fontsize=13, fontweight="bold")
    ax.text(0.58, 0.38, "Liquidez precisa confirmar.", transform=ax.transAxes, color=TEXT, fontsize=22, fontweight="bold")
    ax.text(0.58, 0.14, "Sem perseguir. Só rompimento.", transform=ax.transAxes, color=YELLOW, fontsize=18, fontweight="bold")


def render_radar_report_chart(
    report: Dict[str, Any],
    *,
    candle_limit: int = 110,
    image_format: str = "png",
    dpi: int = 150,
) -> bytes:
    parts = _report_parts(report)
    candles = _fetch_candles(parts["symbol"], parts["timeframe"], limit=max(80, candle_limit))
    frame = _candles_frame(candles[-candle_limit:])

    fig = plt.figure(figsize=(16, 10), facecolor=BG)
    grid = fig.add_gridspec(
        5,
        1,
        height_ratios=[1.45, 0.72, 4.8, 1.05, 1.35],
        hspace=0.16,
        left=0.035,
        right=0.965,
        top=0.97,
        bottom=0.045,
    )
    ax_header = fig.add_subplot(grid[0])
    ax_metrics = fig.add_subplot(grid[1])
    ax_price = fig.add_subplot(grid[2])
    ax_volume = fig.add_subplot(grid[3], sharex=ax_price)
    ax_footer = fig.add_subplot(grid[4])
    for ax in (ax_price, ax_volume):
        ax.set_facecolor("#0b1117")

    _draw_header(ax_header, parts)
    _draw_metrics(ax_metrics, parts)

    if frame.empty:
        ax_price.set_facecolor("#0b1117")
        ax_price.text(0.5, 0.5, "Candles unavailable", color=MUTED, fontsize=22, ha="center", va="center", transform=ax_price.transAxes)
        ax_price.set_axis_off()
        ax_volume.set_axis_off()
    else:
        addplots = [
            mpf.make_addplot(frame["EMA8"], ax=ax_price, color=CYAN, width=1.2),
            mpf.make_addplot(frame["EMA21"], ax=ax_price, color=ORANGE, width=1.2),
            mpf.make_addplot(frame["BB_Upper"], ax=ax_price, color="#6d7884", width=0.7, alpha=0.45),
            mpf.make_addplot(frame["BB_Lower"], ax=ax_price, color="#6d7884", width=0.7, alpha=0.45),
        ]
        if not frame["SMA50"].isna().all():
            addplots.append(mpf.make_addplot(frame["SMA50"], ax=ax_price, color=YELLOW, width=0.9, alpha=0.55))

        mpf.plot(
            frame,
            type="candle",
            ax=ax_price,
            volume=ax_volume,
            addplot=addplots,
            style=_chart_style(),
            datetime_format="%H:%M",
            xrotation=0,
            warn_too_much_data=220,
        )
        for ax in (ax_price, ax_volume):
            ax.set_facecolor("#0b1117")
        _draw_operational_levels(ax_price, report)
        ax_price.set_ylabel("USDT", color=MUTED, fontsize=10)
        ax_volume.set_ylabel("Volume", color=MUTED, fontsize=10)
        ax_price.tick_params(axis="both", colors=MUTED, labelsize=9)
        ax_volume.tick_params(axis="both", colors=MUTED, labelsize=9)
        ax_price.grid(True, color=GRID, alpha=0.55, linewidth=0.8)
        ax_volume.grid(True, color=GRID, alpha=0.35, linewidth=0.6)

    _draw_footer(ax_footer, parts)

    output = BytesIO()
    normalized_format = image_format.lower()
    save_kwargs: Dict[str, Any] = {
        "format": normalized_format,
        "dpi": dpi,
        "facecolor": BG,
        "edgecolor": BG,
    }
    if normalized_format in {"jpg", "jpeg"}:
        save_kwargs["format"] = "jpeg"
        save_kwargs["pil_kwargs"] = {"quality": 92, "optimize": True}
    fig.savefig(output, **save_kwargs)
    plt.close(fig)
    return output.getvalue()


def render_radar_report_social_chart(report: Dict[str, Any], *, candle_limit: int = 110) -> bytes:
    """JPEG variant sized for social media fetchers such as Threads."""
    return render_radar_report_chart(
        report,
        candle_limit=candle_limit,
        image_format="jpeg",
        dpi=90,
    )
