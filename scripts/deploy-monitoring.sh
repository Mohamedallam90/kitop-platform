#!/bin/bash

set -e

# KitOps Monitoring Infrastructure Deployment Script
# This script deploys Prometheus, Grafana, and alerting infrastructure

echo "🚀 Starting KitOps Monitoring Infrastructure Deployment"

# Check prerequisites
command -v kubectl >/dev/null 2>&1 || { echo "❌ kubectl is required but not installed"; exit 1; }
command -v helm >/dev/null 2>&1 || { echo "❌ helm is required but not installed"; exit 1; }

# Configuration
NAMESPACE="monitoring"
GRAFANA_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-"admin123"}
PROMETHEUS_RETENTION=${PROMETHEUS_RETENTION:-"30d"}
GRAFANA_DOMAIN=${GRAFANA_DOMAIN:-"grafana.kitops.com"}
STORAGE_CLASS=${STORAGE_CLASS:-"gp2"}

echo "📋 Configuration:"
echo "  Namespace: $NAMESPACE"
echo "  Grafana Domain: $GRAFANA_DOMAIN"
echo "  Prometheus Retention: $PROMETHEUS_RETENTION"
echo "  Storage Class: $STORAGE_CLASS"

# Create namespace
echo "📁 Creating monitoring namespace..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Add Helm repositories
echo "📦 Adding Helm repositories..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Deploy Prometheus
echo "📊 Deploying Prometheus..."
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: $NAMESPACE
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    rule_files:
      - "/etc/prometheus/rules/*.yml"
    
    scrape_configs:
      - job_name: 'prometheus'
        static_configs:
          - targets: ['localhost:9090']
      
      - job_name: 'kitops-backend'
        scrape_interval: 10s
        metrics_path: /api/v1/metrics
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names: [default, kitops]
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            action: keep
            regex: kitops-backend
          - source_labels: [__meta_kubernetes_pod_ip]
            target_label: __address__
            replacement: \${1}:3000
      
      - job_name: 'kubernetes-nodes'
        kubernetes_sd_configs:
          - role: node
        relabel_configs:
          - action: labelmap
            regex: __meta_kubernetes_node_label_(.+)
EOF

# Deploy Prometheus using the local configuration
echo "🔧 Applying Prometheus configuration..."
kubectl apply -f infrastructure/kubernetes/monitoring/prometheus.yaml

# Wait for Prometheus to be ready
echo "⏳ Waiting for Prometheus to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n $NAMESPACE

# Deploy Grafana
echo "📈 Deploying Grafana..."
kubectl apply -f infrastructure/kubernetes/monitoring/grafana.yaml

# Wait for Grafana to be ready
echo "⏳ Waiting for Grafana to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/grafana -n $NAMESPACE

# Deploy AlertManager (optional)
if [[ "${DEPLOY_ALERTMANAGER:-true}" == "true" ]]; then
  echo "🚨 Deploying AlertManager..."
  
  cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: $NAMESPACE
data:
  alertmanager.yml: |
    global:
      smtp_smarthost: 'localhost:587'
      smtp_from: 'alerts@kitops.com'
    
    route:
      group_by: ['alertname']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 1h
      receiver: 'web.hook'
    
    receivers:
      - name: 'web.hook'
        webhook_configs:
          - url: 'http://slack-webhook-service:9093/hooks/slack'
            send_resolved: true
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alertmanager
  namespace: $NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: alertmanager
  template:
    metadata:
      labels:
        app: alertmanager
    spec:
      containers:
        - name: alertmanager
          image: prom/alertmanager:v0.26.0
          ports:
            - containerPort: 9093
          volumeMounts:
            - name: config
              mountPath: /etc/alertmanager
          resources:
            requests:
              memory: 128Mi
              cpu: 50m
            limits:
              memory: 256Mi
              cpu: 200m
      volumes:
        - name: config
          configMap:
            name: alertmanager-config
---
apiVersion: v1
kind: Service
metadata:
  name: alertmanager
  namespace: $NAMESPACE
spec:
  ports:
    - port: 9093
      targetPort: 9093
  selector:
    app: alertmanager
EOF
fi

# Create ServiceMonitor for automatic scraping
echo "🔍 Creating ServiceMonitor for KitOps..."
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kitops-backend
  namespace: $NAMESPACE
  labels:
    app: kitops-backend
spec:
  selector:
    matchLabels:
      app: kitops-backend
  endpoints:
    - port: http
      path: /api/v1/metrics
      interval: 30s
EOF

# Port forward for initial access
echo "🌐 Setting up port forwarding for initial access..."
echo "  Prometheus: kubectl port-forward -n $NAMESPACE svc/prometheus 9090:9090"
echo "  Grafana: kubectl port-forward -n $NAMESPACE svc/grafana 3000:3000"

# Get Grafana admin password
echo "🔑 Grafana admin credentials:"
echo "  Username: admin"
echo "  Password: $GRAFANA_ADMIN_PASSWORD"

# Create ingress for external access (if domain is configured)
if [[ "$GRAFANA_DOMAIN" != "grafana.kitops.com" ]]; then
  echo "🌍 Creating external access ingress..."
  
  cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: monitoring-ingress
  namespace: $NAMESPACE
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - $GRAFANA_DOMAIN
      secretName: grafana-tls
  rules:
    - host: $GRAFANA_DOMAIN
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: grafana
                port:
                  number: 3000
EOF
fi

# Verify deployment
echo "✅ Verifying deployment..."
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE

echo ""
echo "🎉 Monitoring infrastructure deployed successfully!"
echo ""
echo "📊 Access URLs:"
echo "  Prometheus: http://localhost:9090 (via port-forward)"
echo "  Grafana: http://localhost:3000 (via port-forward)"
if [[ "$GRAFANA_DOMAIN" != "grafana.kitops.com" ]]; then
  echo "  Grafana (External): https://$GRAFANA_DOMAIN"
fi
echo ""
echo "🚀 Next steps:"
echo "  1. Access Grafana and import dashboards"
echo "  2. Configure alerting rules"
echo "  3. Set up notification channels"
echo "  4. Test metric collection from KitOps services"
echo ""
echo "📝 To clean up: kubectl delete namespace $NAMESPACE"