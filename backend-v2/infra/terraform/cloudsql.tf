# Private IP range for Cloud SQL
resource "google_compute_global_address" "private_ip_range" {
  name          = "sne-private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = "projects/${var.project_id}/global/networks/default"
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = "projects/${var.project_id}/global/networks/default"
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

# Cloud SQL PostgreSQL instance
resource "google_sql_database_instance" "sne_db" {
  name             = "sne-db-${var.environment}"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier                        = var.db_tier
    disk_size                   = var.db_disk_size
    disk_type                   = "PD_SSD"
    availability_type           = "ZONAL"
    deletion_protection_enabled = false

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = "projects/${var.project_id}/global/networks/default"
      enable_private_path_for_google_cloud_services = true
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }
  }

  depends_on = [
    google_service_networking_connection.private_vpc_connection,
    google_project_service.required_apis
  ]
}

# Database
resource "google_sql_database" "sne_database" {
  name     = "sne"
  instance = google_sql_database_instance.sne_db.name
}

# Database user
# Password is generated in secrets.tf and stored in Secret Manager
resource "google_sql_user" "sne_admin" {
  name     = "sne_admin"
  instance = google_sql_database_instance.sne_db.name
  password = random_password.db_password.result
}

