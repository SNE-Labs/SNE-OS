# Service Accounts
resource "google_service_account" "sa_sne_web" {
  account_id   = "sa-sne-web"
  display_name = "SNE Web Service Account"
  project      = var.project_id
}

resource "google_service_account" "sa_sne_worker" {
  account_id   = "sa-sne-worker"
  display_name = "SNE Worker Service Account"
  project      = var.project_id
}

resource "google_service_account" "sa_sne_auto" {
  account_id   = "sa-sne-auto"
  display_name = "SNE Auto Service Account"
  project      = var.project_id
}

resource "google_service_account" "sa_sne_telegram" {
  account_id   = "sa-sne-telegram"
  display_name = "SNE Telegram Service Account"
  project      = var.project_id
}

# IAM Roles for sne-web
resource "google_project_iam_member" "sne_web_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.sa_sne_web.email}"
}

resource "google_project_iam_member" "sne_web_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.sa_sne_web.email}"
}

# IAM Roles for sne-worker
resource "google_project_iam_member" "sne_worker_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.sa_sne_worker.email}"
}

resource "google_project_iam_member" "sne_worker_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.sa_sne_worker.email}"
}

resource "google_project_iam_member" "sne_worker_storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.sa_sne_worker.email}"
}

# IAM Roles for sne-auto
resource "google_project_iam_member" "sne_auto_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.sa_sne_auto.email}"
}

resource "google_project_iam_member" "sne_auto_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.sa_sne_auto.email}"
}

resource "google_project_iam_member" "sne_auto_storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.sa_sne_auto.email}"
}

# IAM Roles for sne-telegram
resource "google_project_iam_member" "sne_telegram_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.sa_sne_telegram.email}"
}



