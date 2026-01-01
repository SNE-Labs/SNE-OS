# Cloud Storage bucket for reports
resource "google_storage_bucket" "sne_reports" {
  name          = "sne-reports-${var.project_id}"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  versioning {
    enabled = true
  }
}

# IAM binding for service accounts to write reports
resource "google_storage_bucket_iam_member" "sne_worker_reports" {
  bucket = google_storage_bucket.sne_reports.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.sa_sne_worker.email}"
}

resource "google_storage_bucket_iam_member" "sne_auto_reports" {
  bucket = google_storage_bucket.sne_reports.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.sa_sne_auto.email}"
}



