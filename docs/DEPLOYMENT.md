# KitOps Deployment Guide

This guide covers the deployment of the KitOps platform across different environments, from local development to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [AWS Deployment with Terraform](#aws-deployment-with-terraform)
6. [Environment Configuration](#environment-configuration)
7. [Database Setup](#database-setup)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Node.js** 18+ and npm 8+
- **Docker** 20+ and Docker Compose
- **kubectl** for Kubernetes deployments
- **Terraform** 1.0+ for infrastructure provisioning
- **AWS CLI** configured with appropriate credentials

### Required Accounts
- AWS account with appropriate IAM permissions
- Stripe account for payment processing
- OpenAI API account for AI features
- Domain name and DNS management access

## Local Development

### 1. Clone and Setup
```bash
git clone https://github.com/your-org/kitops-platform.git
cd kitops-platform

# Install dependencies
npm run setup
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your local configuration
```

### 3. Start Services
```bash
# Start database services
npm run docker:up

# Start development servers
npm run dev
```

### 4. Access Applications
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/api/docs

## Docker Deployment

### 1. Build Images
```bash
# Build all images
docker-compose build

# Or build individually
docker build -t kitops/frontend ./frontend
docker build -t kitops/backend ./backend
```

### 2. Production Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  frontend:
    image: kitops/frontend:latest
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://api.yourdomain.com
    restart: unless-stopped

  backend:
    image: kitops/backend:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=kitops
      - POSTGRES_USER=kitops
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 3. Deploy with Docker Compose
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Kubernetes Deployment

### 1. Prepare Kubernetes Cluster
```bash
# Create namespace
kubectl apply -f infrastructure/kubernetes/namespace.yaml

# Apply configurations
kubectl apply -f infrastructure/kubernetes/configmap.yaml
kubectl apply -f infrastructure/kubernetes/secrets.yaml
```

### 2. Deploy Database Services
```bash
# Deploy PostgreSQL
kubectl apply -f infrastructure/kubernetes/postgres.yaml

# Deploy Redis
kubectl apply -f infrastructure/kubernetes/redis.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=kitops-postgres -n kitops --timeout=300s
kubectl wait --for=condition=ready pod -l app=kitops-redis -n kitops --timeout=300s
```

### 3. Deploy Application Services
```bash
# Deploy backend
kubectl apply -f infrastructure/kubernetes/backend.yaml

# Deploy frontend
kubectl apply -f infrastructure/kubernetes/frontend.yaml

# Deploy ingress
kubectl apply -f infrastructure/kubernetes/ingress.yaml
```

### 4. Verify Deployment
```bash
# Check pod status
kubectl get pods -n kitops

# Check services
kubectl get services -n kitops

# Check ingress
kubectl get ingress -n kitops
```

### 5. Scale Services
```bash
# Scale backend
kubectl scale deployment kitops-backend --replicas=5 -n kitops

# Scale frontend
kubectl scale deployment kitops-frontend --replicas=3 -n kitops
```

## AWS Deployment with Terraform

### 1. Configure AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and region
```

### 2. Initialize Terraform
```bash
cd infrastructure/terraform
terraform init
```

### 3. Plan Infrastructure
```bash
terraform plan -var="environment=production" -var="db_password=your_secure_password"
```

### 4. Deploy Infrastructure
```bash
terraform apply -var="environment=production" -var="db_password=your_secure_password"
```

### 5. Configure ECS Services
```bash
# Update ECS task definitions with new image URIs
aws ecs update-service --cluster kitops-production --service kitops-backend --force-new-deployment
aws ecs update-service --cluster kitops-production --service kitops-frontend --force-new-deployment
```

### 6. Setup Domain and SSL
```bash
# Create Route 53 hosted zone
aws route53 create-hosted-zone --name yourdomain.com --caller-reference $(date +%s)

# Request SSL certificate
aws acm request-certificate --domain-name yourdomain.com --domain-name *.yourdomain.com --validation-method DNS
```

## Environment Configuration

### Development Environment
```bash
# .env.development
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=dev_secret_key
STRIPE_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-...
```

### Staging Environment
```bash
# .env.staging
NODE_ENV=staging
DB_HOST=kitops-staging.cluster-xxx.us-west-2.rds.amazonaws.com
DB_PORT=5432
REDIS_HOST=kitops-staging.xxx.cache.amazonaws.com
REDIS_PORT=6379
JWT_SECRET=staging_secret_key
STRIPE_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-...
```

### Production Environment
```bash
# .env.production
NODE_ENV=production
DB_HOST=kitops-prod.cluster-xxx.us-west-2.rds.amazonaws.com
DB_PORT=5432
REDIS_HOST=kitops-prod.xxx.cache.amazonaws.com
REDIS_PORT=6379
JWT_SECRET=super_secure_production_key
STRIPE_SECRET_KEY=sk_live_...
OPENAI_API_KEY=sk-...
```

## Database Setup

### 1. Run Migrations
```bash
# Development
cd backend
npm run migration:run

# Production (using connection string)
DATABASE_URL=postgresql://user:pass@host:5432/db npm run migration:run
```

### 2. Seed Initial Data
```bash
# Load seed data
node scripts/seed-database.js

# Or manually insert demo users
psql -h localhost -U kitops -d kitops -f seed-data/users.sql
```

### 3. Database Backup
```bash
# Create backup
pg_dump -h localhost -U kitops kitops > backup.sql

# Restore backup
psql -h localhost -U kitops kitops < backup.sql
```

## Monitoring and Logging

### 1. Application Monitoring
```bash
# Deploy Prometheus and Grafana
kubectl apply -f monitoring/prometheus.yaml
kubectl apply -f monitoring/grafana.yaml

# Access Grafana dashboard
kubectl port-forward svc/grafana 3000:3000 -n monitoring
```

### 2. Log Aggregation
```bash
# Deploy ELK stack
kubectl apply -f logging/elasticsearch.yaml
kubectl apply -f logging/logstash.yaml
kubectl apply -f logging/kibana.yaml
```

### 3. Health Checks
```bash
# Check application health
curl https://api.yourdomain.com/api/v1/health

# Check database connectivity
kubectl exec -it kitops-backend-xxx -n kitops -- npm run db:check
```

## SSL/TLS Configuration

### 1. Let's Encrypt with Cert-Manager
```bash
# Install cert-manager
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.12.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 2. Update Ingress for SSL
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kitops-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - yourdomain.com
    - api.yourdomain.com
    secretName: kitops-tls
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: kitops-frontend
            port:
              number: 3000
```

## CI/CD Pipeline

### 1. GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2

      - name: Build and push Docker images
        run: |
          aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker build -t $ECR_REGISTRY/kitops-frontend:$GITHUB_SHA ./frontend
          docker build -t $ECR_REGISTRY/kitops-backend:$GITHUB_SHA ./backend
          docker push $ECR_REGISTRY/kitops-frontend:$GITHUB_SHA
          docker push $ECR_REGISTRY/kitops-backend:$GITHUB_SHA

      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster kitops-production --service kitops-frontend --force-new-deployment
          aws ecs update-service --cluster kitops-production --service kitops-backend --force-new-deployment
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database connectivity
kubectl exec -it kitops-backend-xxx -n kitops -- nc -zv kitops-postgres 5432

# Check database logs
kubectl logs kitops-postgres-xxx -n kitops

# Verify credentials
kubectl get secret kitops-secrets -n kitops -o yaml
```

#### 2. Application Not Starting
```bash
# Check pod logs
kubectl logs kitops-backend-xxx -n kitops

# Check pod events
kubectl describe pod kitops-backend-xxx -n kitops

# Check resource limits
kubectl top pods -n kitops
```

#### 3. SSL Certificate Issues
```bash
# Check certificate status
kubectl describe certificate kitops-tls -n kitops

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Manually trigger certificate renewal
kubectl delete certificate kitops-tls -n kitops
kubectl apply -f infrastructure/kubernetes/ingress.yaml
```

#### 4. Performance Issues
```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n kitops

# Scale up services
kubectl scale deployment kitops-backend --replicas=5 -n kitops

# Check database performance
kubectl exec -it kitops-postgres-xxx -n kitops -- psql -U kitops -c "SELECT * FROM pg_stat_activity;"
```

### Rollback Procedures

#### 1. Kubernetes Rollback
```bash
# Check rollout history
kubectl rollout history deployment/kitops-backend -n kitops

# Rollback to previous version
kubectl rollout undo deployment/kitops-backend -n kitops

# Rollback to specific revision
kubectl rollout undo deployment/kitops-backend --to-revision=2 -n kitops
```

#### 2. Database Rollback
```bash
# Restore from backup
kubectl exec -it kitops-postgres-xxx -n kitops -- psql -U kitops -d kitops < backup.sql

# Revert migrations
cd backend
npm run migration:revert
```

### Monitoring Commands

```bash
# Check overall cluster health
kubectl get nodes
kubectl get pods --all-namespaces

# Monitor resource usage
watch kubectl top pods -n kitops

# Check application logs
kubectl logs -f deployment/kitops-backend -n kitops

# Check ingress status
kubectl get ingress -n kitops
kubectl describe ingress kitops-ingress -n kitops
```

This deployment guide provides comprehensive instructions for deploying KitOps across different environments. Always test deployments in staging before applying to production, and maintain regular backups of your data.