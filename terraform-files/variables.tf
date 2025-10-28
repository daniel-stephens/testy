variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Name prefix for resources"
  type        = string
  default     = "tova"
}

variable "vpc_cidr" {
  description = "CIDR for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR for the public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "key_name" {
  description = "Existing EC2 key pair name to SSH into the instance"
  type        = string
}

variable "ssh_cidr" {
  description = "CIDR allowed to SSH to the instance (lock to your IP!)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "repo_url" {
  type    = string
  default = "https://github.com/daniel-stephens/testy.git"
}

variable "repo_branch" {
  type    = string
  default = "main"
}

variable "app_workdir" {
  type    = string
  default = "/home/ubuntu/tova/"
}

variable "app_module" {
  type    = string
  default = "app:app"
} # file:object

variable "service_name" {
  type    = string
  default = "tova"
}

variable "domain_name" {
  type    = string
  default = ""
} # empty = serve by IP
