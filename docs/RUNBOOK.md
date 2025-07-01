# KitOps Platform Runbook

This runbook provides operational procedures for maintaining and troubleshooting the KitOps platform in production.

## Table of Contents

1. [Emergency Contacts](#emergency-contacts)
2. [System Overview](#system-overview)
3. [Monitoring and Alerting](#monitoring-and-alerting)
4. [Common Incidents](#common-incidents)
5. [Maintenance Procedures](#maintenance-procedures)
6. [Backup and Recovery](#backup-and-recovery)
7. [Performance Tuning](#performance-tuning)
8. [Security Procedures](#security-procedures)

## Emergency Contacts

### On-Call Rotation
- **Primary**: DevOps Team Lead
- **Secondary**: Backend Team Lead
- **Escalation**: CTO

### External Vendors
- **AWS Support**: Enterprise Support Plan
- **Stripe Support**: Priority Support
- **OpenAI Support**: Enterprise Support

### Communication Channels
- **Slack**: #incidents (immediate alerts)
- **PagerDuty**: Critical alerts
- **Email**: ops@kitops.com

## System Overview

### Production Environment
- **Frontend**: 3 replicas on ECS/Kubernetes
- **Backend**: 5 replicas on ECS/Kubernetes
- **Database**: PostgreSQL 15 (Multi-AZ RDS)
- **Cache**: Redis Cluster (ElastiCache)
- **Load Balancer**: Application Load Balancer
- **CDN**: CloudFront

### Key Metrics
- **Response Time**: < 200ms (95th percentile)
- **Availability**: 99.9% uptime SLA
- **Error Rate**: < 0.1%
- **Database Connections**: < 80% of max

## Monitoring and Alerting

### Critical Alerts

#### 1. Application Down
```bash
# Check service status
kubectl get pods -n kitops
aws ecs describe-services --cluster kitops-production

# Check load balancer health
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:...

# Immediate actions:
# 1. Check recent deployments
# 2. Review application logs
# 3. Verify database connectivity
# 4. Scale up if resource constrained
```

#### 2. Database Issues
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier kitops-production

# Check connections
kubectl exec -it kitops-backend-xxx -n kitops -- psql -h $DB_HOST -U $DB_USER -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
kubectl exec -it kitops-backend-xxx -n kitops -- psql -h $DB_HOST -U $DB_USER -c "SELECT query, query_start, state FROM pg_stat_activity WHERE state != 'idle' ORDER BY query_start;"

# Immediate actions:
# 1. Check for long-running queries
# 2. Verify backup status
# 3. Consider read replica failover
# 4. Scale database if needed
```

#### 3. High Error Rate
```bash
# Check application logs
kubectl logs -f deployment/kitops-backend -n kitops --tail=100

# Check error patterns
kubectl logs deployment/kitops-backend -n kitops | grep -i error | tail -50

# Check external service status
curl -I https://api.stripe.com/v1/charges
curl -I https://api.openai.com/v1/models

# Immediate actions:
# 1. Identify error patterns
# 2. Check external dependencies
# 3. Consider circuit breaker activation
# 4. Scale services if needed
```

### Warning Alerts

#### 1. High Response Time
```bash
# Check resource usage
kubectl top pods -n kitops
kubectl top nodes

# Check database performance
kubectl exec -it kitops-postgres-xxx -n kitops -- psql -U kitops -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Actions:
# 1. Identify bottlenecks
# 2. Scale horizontally
# 3. Optimize slow queries
# 4. Check cache hit rates
```

#### 2. High Memory Usage
```bash
# Check memory usage by pod
kubectl top pods -n kitops --sort-by=memory

# Check node memory
kubectl describe nodes | grep -A 5 "Allocated resources"

# Actions:
# 1. Identify memory leaks
# 2. Restart high-memory pods
# 3. Scale cluster if needed
# 4. Adjust resource limits
```

## Common Incidents

### Incident Response Process

1. **Acknowledge**: Acknowledge alert in PagerDuty
2. **Assess**: Determine severity and impact
3. **Communicate**: Update status page and stakeholders
4. **Investigate**: Follow troubleshooting procedures
5. **Resolve**: Implement fix and verify resolution
6. **Document**: Create post-incident review

### Incident Severity Levels

#### Severity 1 (Critical)
- Complete service outage
- Data loss or corruption
- Security breach
- **Response Time**: 15 minutes
- **Resolution Time**: 4 hours

#### Severity 2 (High)
- Partial service degradation
- Performance issues affecting users
- Non-critical feature failures
- **Response Time**: 1 hour
- **Resolution Time**: 24 hours

#### Severity 3 (Medium)
- Minor feature issues
- Non-user-facing problems
- **Response Time**: 4 hours
- **Resolution Time**: 72 hours

### Common Troubleshooting Steps

#### 1. Service Unavailable
```bash
# Step 1: Check service status
kubectl get pods -n kitops
kubectl get services -n kitops

# Step 2: Check recent changes
kubectl rollout history deployment/kitops-backend -n kitops
git log --oneline -10

# Step 3: Check logs
kubectl logs deployment/kitops-backend -n kitops --tail=100

# Step 4: Check dependencies
kubectl exec -it kitops-backend-xxx -n kitops -- nc -zv kitops-postgres 5432
kubectl exec -it kitops-backend-xxx -n kitops -- nc -zv kitops-redis 6379

# Step 5: Restart services if needed
kubectl rollout restart deployment/kitops-backend -n kitops
```

#### 2. Database Connection Issues
```bash
# Step 1: Check database status
aws rds describe-db-instances --db-instance-identifier kitops-production

# Step 2: Check connection pool
kubectl exec -it kitops-backend-xxx -n kitops -- node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
});
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? err : res.rows[0]);
  pool.end();
});
"

# Step 3: Check for blocking queries
kubectl exec -it kitops-postgres-xxx -n kitops -- psql -U kitops -c "
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
"

# Step 4: Restart connection pools
kubectl rollout restart deployment/kitops-backend -n kitops
```

#### 3. Memory Leaks
```bash
# Step 1: Identify high memory pods
kubectl top pods -n kitops --sort-by=memory

# Step 2: Check memory trends
kubectl exec -it kitops-backend-xxx -n kitops -- node -e "
console.log('Memory Usage:', process.memoryUsage());
"

# Step 3: Generate heap dump (if Node.js)
kubectl exec -it kitops-backend-xxx -n kitops -- kill -USR2 $(pgrep node)

# Step 4: Restart affected pods
kubectl delete pod kitops-backend-xxx -n kitops
```

## Maintenance Procedures

### Scheduled Maintenance Window
- **Time**: Sundays 2:00 AM - 4:00 AM UTC
- **Notification**: 48 hours advance notice
- **Status Page**: Update maintenance status

### Database Maintenance

#### 1. Database Backup
```bash
# Manual backup
kubectl exec -it kitops-postgres-xxx -n kitops -- pg_dump -U kitops kitops > backup-$(date +%Y%m%d).sql

# Verify backup
kubectl exec -it kitops-postgres-xxx -n kitops -- pg_restore --list backup-$(date +%Y%m%d).sql
```

#### 2. Database Migration
```bash
# Pre-migration checklist:
# 1. Create backup
# 2. Test migration on staging
# 3. Prepare rollback plan
# 4. Schedule maintenance window

# Run migration
kubectl exec -it kitops-backend-xxx -n kitops -- npm run migration:run

# Verify migration
kubectl exec -it kitops-backend-xxx -n kitops -- npm run migration:status
```

#### 3. Database Optimization
```bash
# Analyze table statistics
kubectl exec -it kitops-postgres-xxx -n kitops -- psql -U kitops -c "ANALYZE;"

# Vacuum tables
kubectl exec -it kitops-postgres-xxx -n kitops -- psql -U kitops -c "VACUUM ANALYZE;"

# Reindex if needed
kubectl exec -it kitops-postgres-xxx -n kitops -- psql -U kitops -c "REINDEX DATABASE kitops;"
```

### Application Updates

#### 1. Rolling Deployment
```bash
# Update image tag
kubectl set image deployment/kitops-backend kitops-backend=kitops/backend:v1.2.3 -n kitops

# Monitor rollout
kubectl rollout status deployment/kitops-backend -n kitops

# Verify deployment
kubectl get pods -n kitops -l app=kitops-backend
```

#### 2. Blue-Green Deployment
```bash
# Deploy to green environment
kubectl apply -f k8s/green-deployment.yaml

# Test green environment
curl -H "Host: green.kitops.com" https://your-load-balancer.com/api/v1/health

# Switch traffic
kubectl patch service kitops-backend -n kitops -p '{"spec":{"selector":{"version":"green"}}}'

# Monitor and rollback if needed
kubectl patch service kitops-backend -n kitops -p '{"spec":{"selector":{"version":"blue"}}}'
```

### Infrastructure Updates

#### 1. Kubernetes Cluster Update
```bash
# Check current version
kubectl version --short

# Plan upgrade
aws eks describe-cluster --name kitops-production

# Upgrade cluster (use AWS console or eksctl)
eksctl upgrade cluster --name kitops-production --version 1.28

# Update node groups
eksctl upgrade nodegroup --cluster kitops-production --name workers
```

#### 2. Certificate Renewal
```bash
# Check certificate expiry
kubectl get certificate -n kitops

# Force renewal if needed
kubectl delete certificate kitops-tls -n kitops
kubectl apply -f k8s/ingress.yaml
```

## Backup and Recovery

### Backup Strategy

#### 1. Database Backups
- **Frequency**: Daily automated backups
- **Retention**: 30 days
- **Location**: S3 with cross-region replication
- **Testing**: Weekly restore tests

```bash
# Create backup
aws rds create-db-snapshot --db-instance-identifier kitops-production --db-snapshot-identifier kitops-backup-$(date +%Y%m%d)

# List backups
aws rds describe-db-snapshots --db-instance-identifier kitops-production

# Restore from backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier kitops-restored \
  --db-snapshot-identifier kitops-backup-20240101
```

#### 2. Application Data Backups
```bash
# Backup configuration
kubectl get configmap kitops-config -n kitops -o yaml > config-backup.yaml
kubectl get secret kitops-secrets -n kitops -o yaml > secrets-backup.yaml

# Backup persistent volumes
kubectl get pv,pvc -n kitops
```

### Disaster Recovery

#### 1. Complete Service Recovery
```bash
# Step 1: Assess damage
kubectl get all -n kitops
aws rds describe-db-instances

# Step 2: Restore database
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier kitops-production-restored \
  --db-snapshot-identifier latest-backup

# Step 3: Update DNS
aws route53 change-resource-record-sets --hosted-zone-id Z123456789 --change-batch file://dns-change.json

# Step 4: Deploy applications
kubectl apply -f k8s/

# Step 5: Verify functionality
curl https://api.kitops.com/api/v1/health
```

#### 2. Data Recovery
```bash
# Point-in-time recovery
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier kitops-production \
  --target-db-instance-identifier kitops-recovery \
  --restore-time 2024-01-01T12:00:00.000Z

# Selective data recovery
kubectl exec -it kitops-postgres-xxx -n kitops -- psql -U kitops -c "
INSERT INTO users SELECT * FROM backup_users WHERE created_at > '2024-01-01';
"
```

## Performance Tuning

### Database Performance

#### 1. Query Optimization
```sql
-- Find slow queries
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'users';

-- Create missing indexes
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

#### 2. Connection Pool Tuning
```javascript
// Optimize connection pool settings
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Application Performance

#### 1. Memory Optimization
```bash
# Set appropriate resource limits
kubectl patch deployment kitops-backend -n kitops -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "kitops-backend",
          "resources": {
            "requests": {"memory": "512Mi", "cpu": "250m"},
            "limits": {"memory": "1Gi", "cpu": "500m"}
          }
        }]
      }
    }
  }
}'
```

#### 2. Cache Optimization
```bash
# Check Redis performance
kubectl exec -it kitops-redis-xxx -n kitops -- redis-cli info stats

# Optimize cache settings
kubectl exec -it kitops-redis-xxx -n kitops -- redis-cli config set maxmemory-policy allkeys-lru
```

### Load Balancer Optimization
```bash
# Check target group health
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:...

# Optimize health check settings
aws elbv2 modify-target-group \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --health-check-interval-seconds 10 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3
```

## Security Procedures

### Security Incident Response

#### 1. Suspected Breach
```bash
# Immediate actions:
# 1. Isolate affected systems
kubectl scale deployment kitops-backend --replicas=0 -n kitops

# 2. Preserve evidence
kubectl logs deployment/kitops-backend -n kitops > security-logs-$(date +%Y%m%d).txt

# 3. Change all credentials
kubectl delete secret kitops-secrets -n kitops
kubectl create secret generic kitops-secrets --from-env-file=.env.new -n kitops

# 4. Review access logs
aws logs filter-log-events --log-group-name /aws/ecs/kitops --start-time $(date -d '1 hour ago' +%s)000
```

#### 2. Vulnerability Patching
```bash
# Scan for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image kitops/backend:latest

# Update base images
docker build --no-cache -t kitops/backend:patched ./backend

# Deploy security updates
kubectl set image deployment/kitops-backend kitops-backend=kitops/backend:patched -n kitops
```

### Regular Security Tasks

#### 1. Certificate Management
```bash
# Check certificate expiry
kubectl get certificate -n kitops -o custom-columns=NAME:.metadata.name,READY:.status.conditions[0].status,EXPIRY:.status.notAfter

# Rotate certificates
kubectl delete certificate kitops-tls -n kitops
kubectl apply -f k8s/ingress.yaml
```

#### 2. Access Review
```bash
# Review Kubernetes RBAC
kubectl get rolebindings,clusterrolebindings -o wide

# Review AWS IAM
aws iam list-users
aws iam list-roles
```

#### 3. Security Scanning
```bash
# Scan container images
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image kitops/frontend:latest

# Scan Kubernetes configurations
kubectl run kube-score --rm -i --tty --image=zegl/kube-score:latest -- \
  kube-score score k8s/*.yaml
```

This runbook should be regularly updated as the system evolves and new procedures are developed. Keep it accessible to all team members and ensure everyone is familiar with the emergency procedures.