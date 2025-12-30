# Secret Manager secrets
resource "google_secret_manager_secret" "db_password_secret" {
  secret_id = "sne-db-password"
  project   = var.project_id

  replication {
    auto {}
  }
}

# Generate random password for database
resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password_secret.id
  secret_data = random_password.db_password.result
}

# Data source to read the secret version
data "google_secret_manager_secret_version" "db_password" {
  secret  = google_secret_manager_secret.db_password_secret.secret_id
  project = var.project_id
  depends_on = [google_secret_manager_secret_version.db_password]
}

# Criar versões temporárias para os outros secrets (serão atualizadas depois)
resource "google_secret_manager_secret_version" "telegram_bot_token" {
  secret      = google_secret_manager_secret.telegram_bot_token.id
  secret_data = "TEMPORARY_PLACEHOLDER_UPDATE_AFTER_DEPLOY"
}

resource "google_secret_manager_secret_version" "telegram_chat_id" {
  secret      = google_secret_manager_secret.telegram_chat_id.id
  secret_data = "TEMPORARY_PLACEHOLDER_UPDATE_AFTER_DEPLOY"
}

resource "google_secret_manager_secret_version" "secret_key" {
  secret      = google_secret_manager_secret.secret_key.id
  secret_data = random_password.db_password.result  # Usar senha temporária, atualizar depois
}

resource "google_secret_manager_secret" "telegram_bot_token" {
  secret_id = "sne-telegram-bot-token"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "telegram_chat_id" {
  secret_id = "sne-telegram-chat-id"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "secret_key" {
  secret_id = "sne-secret-key"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "binance_api_key" {
  secret_id = "sne-binance-api-key"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "binance_secret_key" {
  secret_id = "sne-binance-secret-key"
  project   = var.project_id

  replication {
    auto {}
  }
}

