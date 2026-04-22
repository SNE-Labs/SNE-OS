"""Delivery helpers for operational Radar reports."""

from __future__ import annotations

from typing import Any, Dict, Tuple

from .telegram_delivery import send_telegram_photo, send_telegram_text
from .threads_delivery import send_threads_post, threads_configured


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _format_price(value: Any) -> str:
    number = _to_float(value)
    if number >= 100:
        return f"{number:,.2f}"
    if number >= 1:
        return f"{number:,.4f}"
    return f"{number:,.6f}"


def _state_label(state: str) -> str:
    labels = {
        "ready": "Ready",
        "prepare": "Prepare",
        "observe": "Observe",
    }
    return labels.get(str(state or "").lower(), str(state or "Observe").capitalize())


def _halo_line(report_payload: Dict[str, Any]) -> str:
    report_text = str(report_payload.get("report_text") or "")
    marker = "\nHALO\n"
    if marker in report_text:
        return report_text.split(marker, 1)[1].strip().splitlines()[0].strip()
    return "Liquidez precisa confirmar antes da execução."


def build_radar_threads_text(report_payload: Dict[str, Any]) -> str:
    summary = report_payload.get("executive_summary") or {}
    decision = report_payload.get("operator_decision") or {}
    scenarios = report_payload.get("scenarios") or {}
    long_s = scenarios.get("long") or {}
    short_s = scenarios.get("short") or {}
    risk = report_payload.get("risk_plan") or {}

    symbol = str(report_payload.get("symbol") or "BTCUSDT")
    timeframe = str(report_payload.get("timeframe") or "1h")
    state = _state_label(str(decision.get("state") or "observe"))
    bias = str(summary.get("bias") or "sem dados")
    confluence = summary.get("confluence_score", 0)

    lines = [
        f"SNE RADAR | {symbol} ({timeframe})",
        "",
        f"Estado: {state}",
        f"Viés: {bias} | Confluência: {confluence}/100",
        "",
        f"LONG > {_format_price(long_s.get('trigger'))}",
        f"SHORT < {_format_price(short_s.get('trigger'))}",
        "",
        f"Tamanho: {risk.get('position_size_factor', 'N/A')}x | Risco/op: {risk.get('risk_per_trade_pct', 'N/A')}%",
        "",
        f"HALO: {_halo_line(report_payload)}",
    ]
    body = "\n".join(lines).strip()
    if len(body) <= 500:
        return body
    return body[:497].rstrip() + "..."


def send_radar_report_to_telegram(
    report_payload: Dict[str, Any],
    *,
    chart_bytes: bytes = b"",
) -> Tuple[bool, str | None]:
    report_text = str(report_payload.get("report_text") or "").strip()
    if chart_bytes:
        caption = "\n".join([
            f"SNE RADAR | {report_payload.get('symbol')} ({report_payload.get('timeframe')})",
            f"Estado: {str((report_payload.get('operator_decision') or {}).get('state') or 'observe').capitalize()}",
        ]).strip()
        sent, error = send_telegram_photo(chart_bytes, caption=caption, sanitize=True)
        if sent and report_text:
            sent, error = send_telegram_text(report_text, disable_web_page_preview=True, sanitize=True)
        return sent, error
    if report_text:
        return send_telegram_text(report_text, disable_web_page_preview=True, sanitize=True)
    return False, "report_text_empty"


def send_radar_report_to_threads(
    report_payload: Dict[str, Any],
    *,
    image_url: str | None = None,
) -> Tuple[bool, str | None]:
    if not threads_configured():
        return False, "threads_not_configured"
    text = build_radar_threads_text(report_payload)
    sent, _payload, error = send_threads_post(text, image_url=image_url)
    if not sent and image_url and error and "Media download has failed" in error:
        sent, _payload, fallback_error = send_threads_post(text)
        if sent:
            return True, None
        return False, fallback_error or error
    return sent, error
