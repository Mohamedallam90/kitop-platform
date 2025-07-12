variable "aws_region" {
  description = "The AWS region where resources will be created."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "The name of the project, used for tagging resources."
  type        = string
  default     = "kitops"
}

variable "vpc_cidr" {
  description = "The IP address range for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}