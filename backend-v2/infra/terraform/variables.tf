variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region (europe-west1 recommended to avoid Binance geo-blocking)"
  type        = string
  default     = "europe-west1"  # Changed from us-central1 to avoid Binance 451 error
}

variable "zone" {
  description = "GCP Zone (should match region)"
  type        = string
  default     = "europe-west1-b"  # Changed to match europe-west1 region
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "public_web" {
  description = "Allow unauthenticated access to sne-web service"
  type        = bool
  default     = false
}

variable "enable_redis" {
  description = "Enable Memorystore Redis"
  type        = bool
  default     = false
}

variable "min_instances" {
  description = "Minimum instances for Cloud Run services"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum instances for Cloud Run services"
  type        = number
  default     = 10
}

variable "concurrency" {
  description = "Concurrency per Cloud Run instance"
  type        = number
  default     = 80
}

variable "db_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-f1-micro"
}

variable "db_disk_size" {
  description = "Cloud SQL disk size in GB"
  type        = number
  default     = 20
}

variable "redis_memory_size" {
  description = "Redis memory size in GB"
  type        = number
  default     = 1
}

variable "artifact_registry_location" {
  description = "Artifact Registry location (should match region)"
  type        = string
  default     = "europe-west1"  # Changed to match region
}

variable "github_owner" {
  description = "GitHub repository owner (opcional - deixe vazio para não criar trigger)"
  type        = string
  default     = ""
}

variable "github_repo" {
  description = "GitHub repository name (opcional - deixe vazio para não criar trigger)"
  type        = string
  default     = ""
}

variable "vpc_connector_name" {
  description = "VPC Connector name"
  type        = string
  default     = "sne-vpc-connector"
}

variable "vpc_connector_cidr" {
  description = "VPC Connector CIDR range"
  type        = string
  default     = "10.8.0.0/28"
}

