variable "aws_region" {
  description = "AWS region for the Hamburg mobility stack."
  type        = string
  default     = "eu-central-1"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "portfolio"
}

variable "dashboard_image" {
  description = "Immutable dashboard container image URI."
  type        = string
}

variable "private_subnet_ids" {
  description = "Existing private subnets used by the ECS tasks."
  type        = list(string)
}

variable "security_group_ids" {
  description = "Existing security groups allowing the load balancer to reach port 3000."
  type        = list(string)
}
