# Cloud Build Trigger for GitHub (opcional - só cria se github_owner e github_repo estiverem configurados)
resource "google_cloudbuild_trigger" "sne_github_trigger" {
  count       = var.github_owner != "" && var.github_repo != "" ? 1 : 0
  name        = "sne-github-trigger"
  description = "Build and deploy SNE services on push to main"

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^main$"
    }
  }

  filename = "cloudbuild.yaml"

  substitutions = {
    _PROJECT_ID = var.project_id
    _REGION     = var.region
  }

  depends_on = [google_project_service.required_apis]
}

