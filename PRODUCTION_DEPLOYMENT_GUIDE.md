# KitOps Production Deployment Guide

## 🎯 Overview

This guide provides step-by-step instructions for deploying KitOps with enterprise-grade monitoring, data privacy, and accessibility features in a production environment.

## 📋 Prerequisites

### Required Tools
- **kubectl** (v1.25+)
- **helm** (v3.8+)
- **terraform** (v1.5+)
- **docker** (v20.10+)
- **Node.js** (v18+)

### Required Infrastructure
- **Kubernetes Cluster** (v1.25+)
- **PostgreSQL** (v14+)
- **Redis** (v6+)
- **SSL Certificates** (Let's Encrypt or custom)
- **Domain Names** configured with DNS

### Environment Variables
```bash
# Core Application
export ENVIRONMENT=production
export DATABASE_URL="postgresql://user:pass@host:5432/kitops_prod"
export REDIS_URL="redis://redis-host:6379"
export JWT_SECRET="your-strong-jwt-secret"
export ENCRYPTION_KEY="your-32-character-encryption-key"

# Monitoring
export PROMETHEUS_RETENTION="30d"
export GRAFANA_ADMIN_PASSWORD="your-secure-password"
export GRAFANA_DOMAIN="grafana.yourdomain.com"

# Privacy & Security
export ANONYMIZATION_SALT="your-anonymization-salt"
export DATA_RETENTION_DAYS="2555" # 7 years for compliance

# Domains
export FRONTEND_DOMAIN="app.yourdomain.com"
export API_DOMAIN="api.yourdomain.com"
```

## 🚀 Deployment Steps

### 1. Infrastructure Setup

```bash
# Clone the repository
git clone https://github.com/your-org/kitops.git
cd kitops

# Apply Terraform infrastructure
cd infrastructure/terraform
terraform init
terraform plan -var="domain_name=yourdomain.com"
terraform apply

# Get cluster credentials
aws eks update-kubeconfig --region us-west-2 --name kitops-cluster
```

### 2. Install Dependencies

```bash
# Backend dependencies
cd backend
npm ci --production

# Frontend dependencies  
cd ../frontend
npm ci --production

# Install monitoring dependencies
npm install prom-client@15.1.0 winston@3.11.0 winston-elasticsearch@0.17.4

# Install accessibility testing tools
npm install --save-dev cypress-axe@1.5.0 @axe-core/react@4.8.2 jest-axe@8.0.0
```

### 3. Deploy Monitoring Infrastructure

```bash
# Make deployment script executable
chmod +x scripts/deploy-monitoring.sh

# Deploy Prometheus and Grafana
export GRAFANA_DOMAIN="grafana.yourdomain.com"
export GRAFANA_ADMIN_PASSWORD="your-secure-password"
./scripts/deploy-monitoring.sh

# Verify monitoring deployment
kubectl get pods -n monitoring
kubectl get services -n monitoring
```

### 4. Deploy Application

```bash
# Build and push Docker images
docker build -t your-registry/kitops-backend:latest ./backend
docker build -t your-registry/kitops-frontend:latest ./frontend

docker push your-registry/kitops-backend:latest
docker push your-registry/kitops-frontend:latest

# Update Kubernetes manifests with your image URLs
sed -i 's|kitops/backend:latest|your-registry/kitops-backend:latest|g' infrastructure/kubernetes/*.yaml
sed -i 's|kitops/frontend:latest|your-registry/kitops-frontend:latest|g' infrastructure/kubernetes/*.yaml

# Deploy application
kubectl apply -f infrastructure/kubernetes/namespace.yaml
kubectl apply -f infrastructure/kubernetes/secrets.yaml
kubectl apply -f infrastructure/kubernetes/configmap.yaml
kubectl apply -f infrastructure/kubernetes/postgres.yaml
kubectl apply -f infrastructure/kubernetes/redis.yaml
kubectl apply -f infrastructure/kubernetes/backend.yaml
kubectl apply -f infrastructure/kubernetes/frontend.yaml
kubectl apply -f infrastructure/kubernetes/ingress.yaml

# Wait for deployment
kubectl wait --for=condition=available --timeout=300s deployment/kitops-backend
kubectl wait --for=condition=available --timeout=300s deployment/kitops-frontend
```

### 5. Configure SSL/TLS

```bash
# Install cert-manager (if not already installed)
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.13.0 \
  --set installCRDs=true

# Apply SSL certificates
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

## 📊 Monitoring Configuration

### Access Grafana Dashboard

1. **Port Forward** (for initial setup):
```bash
kubectl port-forward -n monitoring svc/grafana 3000:3000
```

2. **Login**: Navigate to `http://localhost:3000`
   - Username: `admin`
   - Password: `$GRAFANA_ADMIN_PASSWORD`

3. **Import Dashboards**:
   - Navigate to **Dashboards → Import**
   - Upload the dashboard from `infrastructure/kubernetes/monitoring/grafana.yaml`

### Configure Alerting

1. **Slack Integration**:
```bash
# Create Slack webhook secret
kubectl create secret generic slack-webhook \
  --from-literal=url="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK" \
  -n monitoring
```

2. **Email Alerts**:
```bash
# Configure SMTP settings in AlertManager
kubectl edit configmap alertmanager-config -n monitoring
```

### Key Metrics to Monitor

- **HTTP Request Rate**: `sum(rate(http_requests_total[5m]))`
- **Error Rate**: `sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100`
- **Response Time**: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
- **Database Connections**: `database_connections_active`
- **Memory Usage**: `process_resident_memory_bytes / 1024 / 1024`
- **User Registrations**: `rate(user_registrations_total[5m])`
- **Workflow Executions**: `rate(workflow_executions_total[5m])`

## 🔒 Privacy & Security Configuration

### Data Anonymization Setup

1. **Configure Backend Service**:
```typescript
// In backend/src/app.module.ts
import { DataAnonymizationService } from './privacy/data-anonymization.service';
import { EncryptionService } from './privacy/encryption.service';

@Module({
  providers: [
    DataAnonymizationService,
    EncryptionService,
    // ... other providers
  ],
})
export class AppModule {}
```

2. **Environment Variables**:
```bash
export ANONYMIZATION_SALT="your-unique-salt-32-characters-long"
export ENCRYPTION_KEY="your-32-character-encryption-key-here"
```

### Encryption at Rest

1. **Database Encryption**:
```sql
-- Enable encryption for sensitive columns
ALTER TABLE users ALTER COLUMN email TYPE bytea USING encrypt_field(email);
ALTER TABLE users ALTER COLUMN phone TYPE bytea USING encrypt_field(phone);
```

2. **File Encryption**:
```typescript
// Example usage in your services
@Injectable()
export class UserService {
  constructor(
    private encryptionService: EncryptionService,
    private anonymizationService: DataAnonymizationService,
  ) {}

  async createUser(userData: CreateUserDto) {
    // Encrypt sensitive fields before storing
    const encryptedData = {
      ...userData,
      email: this.encryptionService.encryptDatabaseField(userData.email),
      phone: this.encryptionService.encryptDatabaseField(userData.phone),
    };
    
    return this.userRepository.save(encryptedData);
  }

  async getAnonymizedLogs(logData: any) {
    return this.anonymizationService.anonymizeForLogs(logData);
  }
}
```

### GDPR Compliance Setup

1. **Data Retention Policy**:
```bash
# Set up automated data cleanup job
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-cleanup
spec:
  schedule: "0 2 * * 0"  # Weekly on Sunday at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cleanup
            image: your-registry/kitops-backend:latest
            command: ["npm", "run", "cleanup:expired-data"]
            env:
            - name: DATA_RETENTION_DAYS
              value: "2555"  # 7 years
          restartPolicy: OnFailure
EOF
```

2. **Data Export Endpoint**:
```typescript
// Add to your user controller
@Get(':id/export')
async exportUserData(@Param('id') userId: string) {
  const userData = await this.userService.exportAllUserData(userId);
  const anonymizedData = this.anonymizationService.anonymizeForExport(userData);
  return anonymizedData;
}
```

## ♿ Accessibility Configuration

### Frontend Setup

1. **Install Accessibility Dependencies**:
```bash
cd frontend
npm install @axe-core/react@4.8.2 --save
npm install --save-dev cypress-axe@1.5.0 jest-axe@8.0.0
```

2. **Add Accessibility Testing**:
```typescript
// In your main layout component
import { useEffect } from 'react';

if (process.env.NODE_ENV === 'development') {
  import('@axe-core/react').then(axe => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

3. **Configure Cypress for A11y Testing**:
```typescript
// cypress/support/e2e.ts
import 'cypress-axe';

// cypress/e2e/accessibility/forms.cy.ts
describe('Form Accessibility', () => {
  beforeEach(() => {
    cy.visit('/contact');
    cy.injectAxe();
  });

  it('should not have accessibility violations', () => {
    cy.checkA11y();
  });

  it('should support keyboard navigation', () => {
    cy.get('[data-testid="field-firstName"]').focus();
    cy.focused().should('have.attr', 'data-testid', 'field-firstName');
    cy.tab();
    cy.focused().should('have.attr', 'data-testid', 'field-email');
  });
});
```

### Run Accessibility Tests

```bash
# Run automated accessibility tests
npm run test:a11y

# Open Cypress for interactive testing
npm run test:a11y:open

# Run unit tests with axe-core
npm test -- --testNamePattern="accessibility"
```

## 🧪 Testing & Validation

### Pre-Deployment Checklist

- [ ] **Infrastructure**: All Terraform resources deployed
- [ ] **Monitoring**: Prometheus and Grafana accessible
- [ ] **SSL/TLS**: Certificates installed and working
- [ ] **Database**: Connections working, encryption enabled
- [ ] **Privacy**: Data anonymization working
- [ ] **Accessibility**: No violations in automated tests
- [ ] **Performance**: Load testing completed
- [ ] **Security**: Vulnerability scanning passed

### Run Production Tests

```bash
# Infrastructure tests
cd infrastructure/terraform
terraform plan -detailed-exitcode

# Backend tests
cd backend
npm run test:e2e

# Frontend tests
cd frontend
npm run test
npm run test:a11y

# Load testing (using k6 or similar)
k6 run tests/load/api-load-test.js

# Security scanning
npm audit --audit-level high
docker scan your-registry/kitops-backend:latest
```

### Health Checks

```bash
# Application health
curl -f https://api.yourdomain.com/api/v1/health || exit 1

# Monitoring health
curl -f http://prometheus:9090/-/healthy || exit 1
curl -f http://grafana:3000/api/health || exit 1

# Database connectivity
kubectl exec -it deployment/kitops-backend -- npm run db:check
```

## 📈 Post-Deployment

### Monitoring Setup

1. **Configure Alerts**:
   - High error rate (>5%)
   - High response time (>2s)
   - Database connection issues
   - Memory usage (>80%)
   - Disk usage (>85%)

2. **Set Up Dashboards**:
   - Application overview
   - Business metrics
   - Infrastructure metrics
   - Security events

3. **Log Aggregation**:
```bash
# Deploy ELK stack for log aggregation
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch
helm install kibana elastic/kibana
helm install filebeat elastic/filebeat
```

### Data Privacy Compliance

1. **Audit Trail Setup**:
```typescript
// Implement audit logging for all data access
@Injectable()
export class AuditService {
  async logDataAccess(userId: string, dataType: string, action: string) {
    const auditLog = {
      userId,
      dataType,
      action,
      timestamp: new Date(),
      ipAddress: this.getClientIP(),
      anonymized: true,
    };
    
    await this.auditRepository.save(auditLog);
  }
}
```

2. **Privacy Policy Updates**:
   - Document data collection practices
   - Explain anonymization procedures
   - Provide data export/deletion procedures
   - Update terms of service

### Accessibility Compliance

1. **Continuous Testing**:
   - Integrate accessibility tests in CI/CD
   - Regular manual testing with screen readers
   - User testing with accessibility users

2. **Documentation**:
   - Accessibility statement
   - Keyboard navigation guide
   - Screen reader compatibility notes

## 🚨 Troubleshooting

### Common Issues

#### Monitoring Not Working
```bash
# Check Prometheus targets
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit http://localhost:9090/targets

# Check Grafana datasource
kubectl logs -n monitoring deployment/grafana
```

#### Privacy/Encryption Issues
```bash
# Check environment variables
kubectl get secret app-secrets -o yaml

# Test encryption service
kubectl exec -it deployment/kitops-backend -- node -e "
const { EncryptionService } = require('./dist/privacy/encryption.service');
const service = new EncryptionService();
console.log('Test encryption:', service.encryptForStorage('test'));
"
```

#### Accessibility Failures
```bash
# Run local accessibility audit
npm run test:a11y:open

# Check browser console for axe-core messages
# Review ARIA attributes and labels
```

### Performance Issues
```bash
# Check resource usage
kubectl top pods
kubectl top nodes

# Review metrics in Grafana
# Check database performance
kubectl logs deployment/postgres
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks

- **Weekly**: Review monitoring alerts and metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Accessibility audit and compliance review
- **Annually**: Security penetration testing and compliance audit

### Backup Strategy

```bash
# Database backups
kubectl exec -it postgres-0 -- pg_dump kitops_prod > backup-$(date +%Y%m%d).sql

# Configuration backups
kubectl get secrets,configmaps -o yaml > k8s-config-backup-$(date +%Y%m%d).yaml

# Monitoring data backup
kubectl exec -it prometheus-0 -- tar czf /tmp/prometheus-data.tar.gz /prometheus/
```

### Contact Information

- **DevOps Team**: devops@yourdomain.com
- **Security Team**: security@yourdomain.com
- **Accessibility Team**: accessibility@yourdomain.com

---

## 🎉 Congratulations!

Your KitOps platform is now deployed with enterprise-grade monitoring, privacy protection, and accessibility features. The system includes:

✅ **Comprehensive Monitoring** with Prometheus and Grafana
✅ **Data Privacy** with encryption and anonymization
✅ **GDPR Compliance** with audit trails and data retention
✅ **Full Accessibility** with WCAG 2.1 AA compliance
✅ **Production Security** with SSL/TLS and secrets management
✅ **Automated Testing** for performance and accessibility

Your platform is ready for production workloads and enterprise customers!