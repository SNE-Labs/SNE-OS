"""Automatic Radar report scheduler.

Runs inside the web service when explicitly enabled by environment variables.
It reuses the same report, chart and Telegram delivery path used by the manual
endpoints, with one dedupe key per symbol/timeframe/window.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import logging
import os
import threading
import time
from typing import Any, Dict, List

from .radar_report_delivery import send_radar_report_to_telegram, send_radar_report_to_threads
from .radar_report_service import build_radar_report
from .radar_report_visuals import render_radar_report_chart
from .utils.redis_safe import SafeRedis


logger = logging.getLogger(__name__)

_THREAD: threading.Thread | None = None
_THREAD_LOCK = threading.Lock()
_LOCAL_CLAIMS: set[str] = set()
_LOCAL_CLAIMS_LOCK = threading.Lock()

_TIMEFRAME_SECONDS = {
    "1m": 60,
    "5m": 5 * 60,
    "15m": 15 * 60,
    "30m": 30 * 60,
    "1h": 60 * 60,
    "4h": 4 * 60 * 60,
    "8h": 8 * 60 * 60,
    "12h": 12 * 60 * 60,
    "1d": 24 * 60 * 60,
}


@dataclass(frozen=True)
class RadarReportSchedule:
    enabled: bool
    symbols: List[str]
    timeframes: List[str]
    channels: List[str]
    include_chart: bool
    check_interval_seconds: int
    boundary_window_seconds: int


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on", "sim"}


def _csv_env(name: str, default: str) -> List[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def _report_channels() -> List[str]:
    channels: List[str] = []
    for item in _csv_env("RADAR_REPORT_AUTO_CHANNELS", "telegram"):
        channel = item.lower()
        if channel in {"telegram", "threads"} and channel not in channels:
            channels.append(channel)
    return channels or ["telegram"]


def _build_schedule() -> RadarReportSchedule:
    symbols = [item.upper().replace("/", "") for item in _csv_env("RADAR_REPORT_AUTO_SYMBOLS", "BTCUSDT,ETHUSDT,SOLUSDT")]
    timeframes = [item for item in _csv_env("RADAR_REPORT_AUTO_TIMEFRAMES", "1h,4h,1d") if item in _TIMEFRAME_SECONDS]
    check_interval = max(30, int(os.getenv("RADAR_REPORT_AUTO_CHECK_INTERVAL_SECONDS", "60")))
    boundary_window = max(check_interval + 5, int(os.getenv("RADAR_REPORT_AUTO_BOUNDARY_WINDOW_SECONDS", "90")))
    return RadarReportSchedule(
        enabled=_env_bool("RADAR_REPORT_AUTO_PUBLISH", False),
        symbols=symbols[:12],
        timeframes=timeframes[:6],
        channels=_report_channels(),
        include_chart=_env_bool("RADAR_REPORT_AUTO_INCLUDE_CHART", True),
        check_interval_seconds=check_interval,
        boundary_window_seconds=boundary_window,
    )


def _radar_chart_public_url(report_payload: Dict[str, Any]) -> str:
    base = (
        os.getenv("RADAR_REPORT_PUBLIC_BASE_URL")
        or os.getenv("PUBLIC_API_BASE")
        or "https://api.snelabs.space"
    ).strip().rstrip("/")
    symbol = str(report_payload.get("symbol") or "BTCUSDT").upper().replace("/", "")
    timeframe = str(report_payload.get("timeframe") or "1h").strip()
    return f"{base}/api/radar/report/chart-social/{symbol}/{timeframe}.jpg"


def _window_id(now: datetime, timeframe: str) -> int:
    interval = _TIMEFRAME_SECONDS[timeframe]
    return int(now.timestamp()) // interval


def _is_due(now: datetime, timeframe: str, boundary_window_seconds: int) -> bool:
    interval = _TIMEFRAME_SECONDS[timeframe]
    return int(now.timestamp()) % interval < boundary_window_seconds


def _claim_window(redis_client: SafeRedis, symbol: str, timeframe: str, window_id: int) -> bool:
    key = f"radar:auto-report:{symbol}:{timeframe}:{window_id}"
    if redis_client.get(key):
        return False
    ttl = max(_TIMEFRAME_SECONDS.get(timeframe, 3600) * 2, 3600)
    if redis_client.setex(key, ttl, "1"):
        return True

    with _LOCAL_CLAIMS_LOCK:
        if key in _LOCAL_CLAIMS:
            return False
        _LOCAL_CLAIMS.add(key)
    return True


def _send_report(symbol: str, timeframe: str, include_chart: bool, channels: List[str]) -> Dict[str, Any]:
    report_payload = build_radar_report(
        symbol=symbol,
        timeframe=timeframe,
        authenticated=False,
        has_access=False,
    )
    report_text = str(report_payload.get("report_text") or "").strip()
    chart_bytes = b""
    if include_chart and report_payload.get("status") == "ready":
        chart_bytes = render_radar_report_chart(report_payload)

    channel_results = []
    for channel in channels:
        if channel == "telegram":
            sent, error = send_radar_report_to_telegram(report_payload, chart_bytes=chart_bytes)
        else:
            sent, error = send_radar_report_to_threads(
                report_payload,
                image_url=_radar_chart_public_url(report_payload) if chart_bytes else None,
            )
        channel_results.append({"channel": channel, "sent": sent, "error": error})

    return {
        "symbol": report_payload.get("symbol"),
        "timeframe": report_payload.get("timeframe"),
        "status": report_payload.get("status"),
        "sent": any(item.get("sent") for item in channel_results),
        "chart": bool(chart_bytes),
        "channels": channel_results,
    }


def _run_due_reports(schedule: RadarReportSchedule, redis_client: SafeRedis) -> None:
    now = datetime.now(timezone.utc)
    for timeframe in schedule.timeframes:
        if not _is_due(now, timeframe, schedule.boundary_window_seconds):
            continue
        window = _window_id(now, timeframe)
        for symbol in schedule.symbols:
            if not _claim_window(redis_client, symbol, timeframe, window):
                continue
            try:
                result = _send_report(symbol, timeframe, schedule.include_chart, schedule.channels)
                logger.info("Radar auto report result: %s", result)
            except Exception as exc:
                logger.exception("Radar auto report failed: symbol=%s timeframe=%s error=%s", symbol, timeframe, exc)


def _scheduler_loop(schedule: RadarReportSchedule) -> None:
    logger.info(
        "Radar report auto scheduler started: symbols=%s timeframes=%s channels=%s chart=%s",
        schedule.symbols,
        schedule.timeframes,
        schedule.channels,
        schedule.include_chart,
    )
    redis_client = SafeRedis()
    while True:
        _run_due_reports(schedule, redis_client)
        time.sleep(schedule.check_interval_seconds)


def start_radar_report_scheduler() -> None:
    schedule = _build_schedule()
    if not schedule.enabled:
        logger.info("Radar report auto scheduler disabled")
        return
    if not schedule.symbols or not schedule.timeframes:
        logger.warning("Radar report auto scheduler not started: empty symbols or timeframes")
        return

    global _THREAD
    with _THREAD_LOCK:
        if _THREAD and _THREAD.is_alive():
            return
        _THREAD = threading.Thread(
            target=_scheduler_loop,
            args=(schedule,),
            name="radar-report-auto-scheduler",
            daemon=True,
        )
        _THREAD.start()
