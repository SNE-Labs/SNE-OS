# Artifact Registry repository
resource "google_artifact_registry_repository" "sne_artifacts" {
  location      = var.artifact_registry_location
  repository_id = "sne-artifacts"
  description   = "SNE Docker images"
  format        = "DOCKER"

  depends_on = [google_project_service.required_apis]
}



