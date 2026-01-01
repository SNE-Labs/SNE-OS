# Cloud Run Service: sne-web
# Nota: Imagem será atualizada após build e push para Artifact Registry
resource "google_cloud_run_v2_service" "sne_web" {
  name     = "sne-web"
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.sa_sne_web.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      # Imagem placeholder - será atualizada após build e push
      image = "gcr.io/cloudrun/hello"

      ports {
        container_port = 8080
      }

      env {
        name  = "DATABASE_URL"
        value = "postgresql://${google_sql_user.sne_admin.name}:${data.google_secret_manager_secret_version.db_password.secret_data}@/${google_sql_database.sne_database.name}?host=/cloudsql/${google_sql_database_instance.sne_db.connection_name}"
      }

      env {
        name = "SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret_key.secret_id
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }
    }

    vpc_access {
      connector = "projects/${var.project_id}/locations/${var.region}/connectors/${google_vpc_access_connector.sne_connector.name}"
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  depends_on = [google_project_service.required_apis]
}

# IAM: Allow public access to sne-web (if configured)
resource "google_cloud_run_service_iam_member" "sne_web_public" {
  count    = var.public_web ? 1 : 0
  service  = google_cloud_run_v2_service.sne_web.name
  location = google_cloud_run_v2_service.sne_web.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Cloud Run Service: sne-worker
resource "google_cloud_run_v2_service" "sne_worker" {
  name     = "sne-worker"
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.sa_sne_worker.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = "gcr.io/cloudrun/hello"

      ports {
        container_port = 8080
      }

      env {
        name  = "DATABASE_URL"
        value = "postgresql://${google_sql_user.sne_admin.name}:${data.google_secret_manager_secret_version.db_password.secret_data}@/${google_sql_database.sne_database.name}?host=/cloudsql/${google_sql_database_instance.sne_db.connection_name}"
      }

      env {
        name  = "REDIS_URL"
        value = var.enable_redis ? "redis://${google_redis_instance.sne_redis[0].host}:${google_redis_instance.sne_redis[0].port}" : ""
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
      }
    }

    vpc_access {
      connector = "projects/${var.project_id}/locations/${var.region}/connectors/${google_vpc_access_connector.sne_connector.name}"
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  depends_on = [google_project_service.required_apis]
}

# Cloud Run Service: sne-auto
resource "google_cloud_run_v2_service" "sne_auto" {
  name     = "sne-auto"
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.sa_sne_auto.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = "gcr.io/cloudrun/hello"

      ports {
        container_port = 8080
      }

      env {
        name  = "DATABASE_URL"
        value = "postgresql://${google_sql_user.sne_admin.name}:${data.google_secret_manager_secret_version.db_password.secret_data}@/${google_sql_database.sne_database.name}?host=/cloudsql/${google_sql_database_instance.sne_db.connection_name}"
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }

    vpc_access {
      connector = "projects/${var.project_id}/locations/${var.region}/connectors/${google_vpc_access_connector.sne_connector.name}"
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  depends_on = [google_project_service.required_apis]
}

# Cloud Run Service: sne-telegram
resource "google_cloud_run_v2_service" "sne_telegram" {
  name     = "sne-telegram"
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.sa_sne_telegram.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = "gcr.io/cloudrun/hello"

      ports {
        container_port = 8080
      }

      env {
        name = "TELEGRAM_BOT_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.telegram_bot_token.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "TELEGRAM_CHAT_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.telegram_chat_id.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret_key.secret_id
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  depends_on = [google_project_service.required_apis]
}

