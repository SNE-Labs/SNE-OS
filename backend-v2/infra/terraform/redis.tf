# Memorystore Redis (optional)
resource "google_redis_instance" "sne_redis" {
  count          = var.enable_redis ? 1 : 0
  name           = "sne-redis-${var.environment}"
  tier           = "BASIC"
  memory_size_gb = var.redis_memory_size
  region         = var.region
  location_id    = var.zone

  redis_version     = "REDIS_7_0"
  display_name      = "SNE Redis Cache"
  reserved_ip_range = "10.0.0.0/29"

  depends_on = [google_project_service.required_apis]
}



