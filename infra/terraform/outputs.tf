output "lakehouse_bucket" {
  description = "Versioned S3 bucket for bronze and silver data."
  value       = aws_s3_bucket.lakehouse.id
}

output "ecs_cluster" {
  description = "ECS cluster hosting the dashboard."
  value       = aws_ecs_cluster.this.name
}

output "dashboard_service" {
  description = "ECS service name."
  value       = aws_ecs_service.dashboard.name
}
