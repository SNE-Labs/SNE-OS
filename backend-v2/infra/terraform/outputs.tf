output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "cloud_run_services" {
  description = "Cloud Run service URLs"
  value = {
    sne-web      = google_cloud_run_v2_service.sne_web.uri
    sne-worker   = google_cloud_run_v2_service.sne_worker.uri
    sne-auto     = google_cloud_run_v2_service.sne_auto.uri
    sne-telegram = google_cloud_run_v2_service.sne_telegram.uri
  }
}

output "cloud_sql_instance_connection_name" {
  description = "Cloud SQL instance connection name"
  value       = google_sql_database_instance.sne_db.connection_name
}

output "cloud_sql_instance_ip" {
  description = "Cloud SQL private IP"
  value       = google_sql_database_instance.sne_db.private_ip_address
  sensitive   = true
}

output "database_name" {
  description = "Database name"
  value       = google_sql_database.sne_database.name
}

output "database_user" {
  description = "Database user"
  value       = google_sql_user.sne_admin.name
}

output "redis_host" {
  description = "Redis host (if enabled)"
  value       = var.enable_redis ? google_redis_instance.sne_redis[0].host : null
}

output "redis_port" {
  description = "Redis port (if enabled)"
  value       = var.enable_redis ? google_redis_instance.sne_redis[0].port : null
}

output "storage_bucket" {
  description = "Cloud Storage bucket for reports"
  value       = google_storage_bucket.sne_reports.name
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository URL"
  value       = google_artifact_registry_repository.sne_artifacts.name
}

output "vpc_connector_name" {
  description = "VPC Connector name"
  value       = google_vpc_access_connector.sne_connector.name
}

output "service_accounts" {
  description = "Service account emails"
  value = {
    sne-web      = google_service_account.sa_sne_web.email
    sne-worker   = google_service_account.sa_sne_worker.email
    sne-auto     = google_service_account.sa_sne_auto.email
    sne-telegram = google_service_account.sa_sne_telegram.email
  }
}



