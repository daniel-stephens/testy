variable "project_name" {
  description = "Base name for ECS/ALB resources"
  type        = string
  default     = "Tova"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "image_url" {
  description = "Full ECR image URL with tag (e.g. 123456789012.dkr.ecr.us-east-1.amazonaws.com/flask-ecs:latest)"
  type        = string
}

variable "container_port" {
  description = "Container port your Gunicorn listens on"
  type        = number
  default     = 9090
}

variable "desired_count" {
  description = "Number of tasks to run"
  type        = number
  default     = 1
}

variable "cpu" {
  description = "Task CPU units (256=0.25 vCPU)"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Task memory MiB"
  type        = number
  default     = 512
}

variable "alb_ingress_cidr" {
  description = "CIDR allowed to reach ALB (0.0.0.0/0 = public)"
  type        = string
  default     = "0.0.0.0/0"
}
