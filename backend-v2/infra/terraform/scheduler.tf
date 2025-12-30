# Cloud Scheduler: Run scan every 5 minutes
resource "google_cloud_scheduler_job" "sne_auto_scan" {
  name             = "sne-auto-scan"
  description      = "Trigger sne-auto scan every 5 minutes"
  schedule         = "*/5 * * * *"
  time_zone        = "UTC"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.sne_auto.uri}/run-scan"
    headers = {
      "Content-Type" = "application/json"
    }
    body = base64encode(jsonencode({
      pairs      = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
      timeframes = ["15m", "1h"]
    }))

    oidc_token {
      service_account_email = google_service_account.sa_sne_auto.email
    }
  }

  depends_on = [google_project_service.required_apis]
}



