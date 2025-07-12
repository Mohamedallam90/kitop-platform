# This data block gets our current AWS account ID for use in other resources.
data "aws_caller_identity" "current" {}

# --- Virtual Private Cloud (VPC) ---
# This defines our foundational network with public and private subnets.
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.3"

  name = "${var.project_name}-vpc"
  cidr = var.vpc_cidr

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

# --- EKS Kubernetes Cluster ---
# This defines the main compute engine for our application.
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.8.4"

  cluster_name    = "${var.project_name}-cluster"
  cluster_version = "1.29"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Correctly configure public and private access for the endpoint
  cluster_endpoint_private_access = true
  cluster_endpoint_public_access  = true

  # Allow access from your Codespace IP AND the additional IP from variables
    cluster_endpoint_public_access_cidrs = [
    # Add your allowed CIDRs here, for example:
    "0.0.0.0/0"
  ]

   access_entries = {
  terraform_admin = {
    kubernetes_groups = ["cluster-admin"]
    principal_arn     = "arn:aws:iam::042545045755:user/terraform-admin"
    type              = "STANDARD"
    username          = "terraform-admin"
  }
}


  # EKS Managed Node Group - This is where our application pods will run
  eks_managed_node_groups = {
    general_purpose = {
      instance_types = ["t3.medium"]
      min_size       = 1
      max_size       = 3
      desired_size   = 2
    }
  }

  # Inside module "eks"

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }

  # THIS IS THE CRITICAL BOOTSTRAP CONFIGURATION
  # bootstrap_cluster_creator_admin_permissions = true

} # This is the closing brace for module "eks"

# --- Outputs ---
# These outputs provide useful information back to us after the apply is complete.

output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "private_subnet_ids" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "eks_cluster_name" {
  description = "The name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "The endpoint for the EKS cluster's API server"
  value       = module.eks.cluster_endpoint
}
# --- ECR (Elastic Container Registry) ---
# A private registry to store our application's Docker images.

resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}/backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "${var.project_name}/frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

# --- RDS PostgreSQL Database ---
# A managed, production-grade database for our application.

resource "aws_db_instance" "main_db" {
  identifier_prefix      = "${var.project_name}-"
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = "db.t3.micro" # A small size, good for the Free Tier
  allocated_storage      = 20            # In GB

  db_name                = "${var.project_name}_db"
  username               = "db_admin"
  password               = random_password.db_password.result # Securely generated password

  db_subnet_group_name   = aws_db_subnet_group.main_db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]

  skip_final_snapshot    = true # Set to false for production
  publicly_accessible    = false

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

# --- Database Security ---

# A security group that only allows traffic from our EKS nodes to the database.
resource "aws_security_group" "db_sg" {
  name        = "${var.project_name}-db-sg"
  description = "Allow traffic from EKS nodes to the database"
  vpc_id      = module.vpc.vpc_id

  # Ingress rule: Allow PostgreSQL traffic from the EKS node security group
  ingress {
    from_port       = 5432 # PostgreSQL port
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }

  # Egress rule: Allow all outbound traffic (standard)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name      = "${var.project_name}-db-sg"
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

# --- Secret Password Generation ---

# A resource to generate a secure, random password for the database.
resource "random_password" "db_password" {
  length           = 16
  special          = true
  override_special = "!#$%&'()*+,-./:;<=>?@[]^_`{|}~"
}

# Store the generated password securely in AWS Secrets Manager.
resource "aws_secretsmanager_secret" "db_password_secret" {
  name = "${var.project_name}/db_password"
}

resource "aws_secretsmanager_secret_version" "db_password_secret_version" {
  secret_id     = aws_secretsmanager_secret.db_password_secret.id
  secret_string = random_password.db_password.result
}

# --- New Outputs ---

output "backend_ecr_repo_url" {
  description = "The URL of the backend ECR repository"
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_repo_url" {
  description = "The URL of the frontend ECR repository"
  value       = aws_ecr_repository.frontend.repository_url
}

output "db_endpoint" {
  description = "The endpoint of the RDS database instance"
  value       = aws_db_instance.main_db.endpoint
}

# Explicitly create a DB subnet group using the private subnets from our VPC.
resource "aws_db_subnet_group" "main_db_subnet_group" {
  name       = "${var.project_name}-main-subnet-group"
  subnet_ids = module.vpc.private_subnets

  tags = {
    Name      = "${var.project_name}-main-subnet-group"
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

output "db_password_secret_arn" {
  description = "The ARN of the secret containing the database password"
  value       = aws_secretsmanager_secret.db_password_secret.arn
}