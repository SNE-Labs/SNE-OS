"""
Lightweight visual renderer for operational Radar reports.

Uses Pillow so production can render report charts without adding a heavy
matplotlib stack. The legacy beta chart scripts remain useful references for
future richer renderers.
"""

from __future__ import annotations

from io import BytesIO
from typing import Any, Dict, List, Tuple

from PIL import Image, ImageDraw, ImageFont

from .radar_report_service import _fetch_candles


WIDTH = 1600
HEIGHT = 1000
BG = "#080b0f"
PANEL = "#10161d"
GRID = "#25313b"
TEXT = "#e8eef5"
MUTED = "#8c9aa8"
GREEN = "#2ee59d"
RED = "#ff5c7a"
CYAN = "#49d3ff"
YELLOW = "#f4d35e"
ORANGE = "#ff9f43"


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    names = [
        "arialbd.ttf" if bold else "arial.ttf",
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
    ]
    for name in names:
        try:
            return ImageFont.truetype(name, size=size)
        except Exception:
            continue
    return ImageFont.load_default()


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


def _ema(values: List[float], period: int) -> List[float | None]:
    if len(values) < period:
        return [None for _ in values]
    result: List[float | None] = [None for _ in values]
    current = sum(values[:period]) / period
    result[period - 1] = current
    multiplier = 2 / (period + 1)
    for index in range(period, len(values)):
        current = (values[index] - current) * multiplier + current
        result[index] = current
    return result


def _scale(value: float, low: float, high: float, top: int, bottom: int) -> int:
    if high <= low:
        return (top + bottom) // 2
    return int(bottom - ((value - low) / (high - low)) * (bottom - top))


def _draw_text(draw: ImageDraw.ImageDraw, xy: Tuple[int, int], text: str, *, size: int = 28, fill: str = TEXT, bold: bool = False) -> None:
    draw.text(xy, text, font=_font(size, bold=bold), fill=fill)


def _draw_label(draw: ImageDraw.ImageDraw, x: int, y: int, label: str, value: str, fill: str = TEXT) -> None:
    _draw_text(draw, (x, y), label.upper(), size=18, fill=MUTED, bold=True)
    _draw_text(draw, (x, y + 26), value, size=30, fill=fill, bold=True)


def _draw_polyline(
    draw: ImageDraw.ImageDraw,
    values: List[float | None],
    x_positions: List[int],
    low: float,
    high: float,
    top: int,
    bottom: int,
    fill: str,
    width: int = 3,
) -> None:
    points: List[Tuple[int, int]] = []
    for x, value in zip(x_positions, values):
        if value is None:
            if len(points) > 1:
                draw.line(points, fill=fill, width=width)
            points = []
            continue
        points.append((x, _scale(value, low, high, top, bottom)))
    if len(points) > 1:
        draw.line(points, fill=fill, width=width)


def render_radar_report_chart(report: Dict[str, Any], *, candle_limit: int = 90) -> bytes:
    symbol = str(report.get("symbol") or "BTCUSDT")
    timeframe = str(report.get("timeframe") or "1h")
    candles = _fetch_candles(symbol, timeframe, limit=max(60, candle_limit))
    candles = candles[-candle_limit:]

    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)

    draw.rectangle((40, 40, WIDTH - 40, 150), fill=PANEL, outline="#1f2a34", width=2)
    _draw_text(draw, (70, 62), f"SNE RADAR | {symbol} ({timeframe})", size=38, fill=TEXT, bold=True)
    summary = report.get("executive_summary") or {}
    decision = report.get("operator_decision") or {}
    _draw_text(draw, (70, 108), str(decision.get("title") or summary.get("headline") or "Relatorio operacional"), size=24, fill=MUTED)

    price = _fmt_price(summary.get("price"))
    confluence = str(summary.get("confluence_score") or 0)
    bias = str(summary.get("bias") or "sem dados")
    risk_state = str((report.get("risk_plan") or {}).get("state") or "observe")
    _draw_label(draw, 70, 185, "Preco", price, CYAN)
    _draw_label(draw, 320, 185, "Confluencia", f"{confluence}/100", YELLOW)
    _draw_label(draw, 570, 185, "Bias", bias, GREEN if bias == "alta" else RED if bias == "baixa" else TEXT)
    _draw_label(draw, 820, 185, "Risco", risk_state, ORANGE if risk_state != "ready" else GREEN)
    _draw_label(draw, 1070, 185, "RSI", str(summary.get("rsi") or "N/A"), TEXT)
    _draw_label(draw, 1300, 185, "Vol ratio", str(summary.get("volume_ratio") or "N/A"), TEXT)

    chart_left, chart_top, chart_right, chart_bottom = 70, 305, 1530, 760
    draw.rectangle((chart_left, chart_top, chart_right, chart_bottom), fill="#0b1117", outline="#1f2a34", width=2)

    if candles:
        lows = [item["low"] for item in candles]
        highs = [item["high"] for item in candles]
        closes = [item["close"] for item in candles]
        levels = report.get("technical", {}).get("levels", {})
        level_values = [item.get("price") for item in levels.get("supports", []) + levels.get("resistances", [])]
        scenarios = report.get("scenarios") or {}
        for side in ("long", "short"):
            scenario = scenarios.get(side) or {}
            level_values.extend([scenario.get("trigger"), scenario.get("stop"), scenario.get("tp1")])
        extra = [_to_float(value) for value in level_values if value is not None]
        low = min(lows + extra)
        high = max(highs + extra)
        pad = max((high - low) * 0.08, high * 0.001)
        low -= pad
        high += pad

        for index in range(6):
            y = chart_top + int((chart_bottom - chart_top) * index / 5)
            draw.line((chart_left, y, chart_right, y), fill=GRID, width=1)
            level = high - ((high - low) * index / 5)
            _draw_text(draw, (chart_right - 115, y - 12), _fmt_price(level), size=18, fill=MUTED)

        step = (chart_right - chart_left) / max(1, len(candles))
        xs = [int(chart_left + (index + 0.5) * step) for index in range(len(candles))]
        candle_width = max(3, int(step * 0.55))
        for x, candle in zip(xs, candles):
            open_y = _scale(candle["open"], low, high, chart_top, chart_bottom)
            close_y = _scale(candle["close"], low, high, chart_top, chart_bottom)
            high_y = _scale(candle["high"], low, high, chart_top, chart_bottom)
            low_y = _scale(candle["low"], low, high, chart_top, chart_bottom)
            color = GREEN if candle["close"] >= candle["open"] else RED
            draw.line((x, high_y, x, low_y), fill=color, width=2)
            y1, y2 = sorted([open_y, close_y])
            draw.rectangle((x - candle_width // 2, y1, x + candle_width // 2, max(y2, y1 + 2)), fill=color)

        _draw_polyline(draw, _ema(closes, 8), xs, low, high, chart_top, chart_bottom, CYAN, width=3)
        _draw_polyline(draw, _ema(closes, 21), xs, low, high, chart_top, chart_bottom, ORANGE, width=3)

        for label, color, values in [
            ("S", GREEN, levels.get("supports", [])[:2]),
            ("R", RED, levels.get("resistances", [])[:2]),
        ]:
            for item in values:
                value = _to_float(item.get("price"))
                y = _scale(value, low, high, chart_top, chart_bottom)
                draw.line((chart_left, y, chart_right, y), fill=color, width=2)
                _draw_text(draw, (chart_left + 8, y - 22), f"{label} {_fmt_price(value)}", size=18, fill=color, bold=True)

        for side, color in [("long", GREEN), ("short", RED)]:
            scenario = scenarios.get(side) or {}
            trigger = scenario.get("trigger")
            if trigger is None:
                continue
            y = _scale(_to_float(trigger), low, high, chart_top, chart_bottom)
            draw.line((chart_left, y, chart_right, y), fill=color, width=3)
            _draw_text(draw, (chart_left + 220, y - 24), f"{side.upper()} trigger {_fmt_price(trigger)}", size=20, fill=color, bold=True)
    else:
        _draw_text(draw, (chart_left + 40, chart_top + 180), "Candles indisponiveis para renderizar grafico.", size=28, fill=MUTED)

    scenarios = report.get("scenarios") or {}
    long_s = scenarios.get("long") or {}
    short_s = scenarios.get("short") or {}
    draw.rectangle((40, 800, WIDTH - 40, 950), fill=PANEL, outline="#1f2a34", width=2)
    _draw_text(draw, (70, 825), "Cenarios operacionais", size=28, fill=TEXT, bold=True)
    _draw_text(draw, (70, 870), f"LONG  gatilho {_fmt_price(long_s.get('trigger'))} | stop {_fmt_price(long_s.get('stop'))} | TP1 {_fmt_price(long_s.get('tp1'))}", size=24, fill=GREEN)
    _draw_text(draw, (70, 910), f"SHORT gatilho {_fmt_price(short_s.get('trigger'))} | stop {_fmt_price(short_s.get('stop'))} | TP1 {_fmt_price(short_s.get('tp1'))}", size=24, fill=RED)
    _draw_text(draw, (980, 870), str(decision.get("next_action") or "Confirmar setup antes de executar."), size=22, fill=MUTED)

    output = BytesIO()
    image.save(output, format="PNG", optimize=True)
    return output.getvalue()
