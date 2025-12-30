# VPC Connector for Cloud Run to access Cloud SQL private IP
resource "google_vpc_access_connector" "sne_connector" {
  name          = var.vpc_connector_name
  region        = var.region
  network       = "default"
  ip_cidr_range = var.vpc_connector_cidr
  machine_type  = "e2-micro"
  min_instances = 2
  max_instances = 3

  depends_on = [google_project_service.required_apis]
}



