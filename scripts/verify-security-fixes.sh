#!/bin/bash

# Security Fixes Verification Script
# This script verifies that all Codacy-reported security issues have been resolved

set -e

echo "🔍 Verifying Security Fixes Implementation..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED_CHECKS=0

# Function to print status
print_status() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        ((FAILED_CHECKS++))
    fi
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo ""
echo "1. 🔐 Checking GitHub Actions SHA Pinning..."
echo "=============================================="

# Check if all GitHub Actions are pinned to SHAs (40 characters)
SHA_PATTERN="[a-f0-9]{40}"
ACTIONS_FILE=".github/workflows/ci.yml"

if [ -f "$ACTIONS_FILE" ]; then
    # Check for specific actions that should be pinned
    UNPINNED_ACTIONS=$(grep -E "uses: (aquasecurity/trivy-action|codecov/codecov-action|docker/login-action|docker/build-push-action|aws-actions/configure-aws-credentials|docker/metadata-action|snyk/actions/node|docker/setup-buildx-action|azure/setup-kubectl)@[^a-f0-9]" "$ACTIONS_FILE" || true)
    
    if [ -z "$UNPINNED_ACTIONS" ]; then
        print_status "All GitHub Actions are pinned to commit SHAs" 0
    else
        print_status "Some GitHub Actions are not pinned to commit SHAs" 1
        echo "$UNPINNED_ACTIONS"
    fi
else
    print_status "GitHub Actions workflow file not found" 1
fi

echo ""
echo "2. 🗄️ Checking Terraform Database Security..."
echo "=============================================="

TERRAFORM_FILE="infrastructure/terraform/main.tf"

if [ -f "$TERRAFORM_FILE" ]; then
    # Check for CloudWatch logs exports
    if grep -q "enabled_cloudwatch_logs_exports.*postgresql" "$TERRAFORM_FILE"; then
        print_status "PostgreSQL CloudWatch logs exports enabled" 0
    else
        print_status "PostgreSQL CloudWatch logs exports not found" 1
    fi
    
    # Check for performance insights
    if grep -q "performance_insights_enabled.*true" "$TERRAFORM_FILE"; then
        print_status "PostgreSQL Performance Insights enabled" 0
    else
        print_status "PostgreSQL Performance Insights not found" 1
    fi
    
    # Check for HTTPS listener
    if grep -q "protocol.*HTTPS" "$TERRAFORM_FILE"; then
        print_status "Load balancer HTTPS protocol configured" 0
    else
        print_status "Load balancer HTTPS protocol not found" 1
    fi
    
    # Check for ACM certificate
    if grep -q "aws_acm_certificate" "$TERRAFORM_FILE"; then
        print_status "ACM certificate configured" 0
    else
        print_status "ACM certificate not found" 1
    fi
    
    # Check for secure public subnets
    if grep -q "map_public_ip_on_launch.*false" "$TERRAFORM_FILE"; then
        print_status "Public subnets do not auto-assign public IPs" 0
    else
        print_status "Public subnets may auto-assign public IPs" 1
    fi
else
    print_status "Terraform main.tf file not found" 1
fi

echo ""
echo "3. 🔑 Checking Kubernetes Secrets Security..."
echo "=============================================="

SECRETS_FILE="infrastructure/kubernetes/secrets.yaml"

if [ -f "$SECRETS_FILE" ]; then
    # Check that hardcoded secrets are removed
    if grep -q "data:" "$SECRETS_FILE" && grep -q "a2l0b3Bz\|cGFzc3dvcmQ=\|c3VwZXI=" "$SECRETS_FILE"; then
        print_status "Hardcoded secrets found in secrets.yaml" 1
    else
        print_status "No hardcoded secrets found in secrets.yaml" 0
    fi
    
    # Check for secrets provisioner
    PROVISIONER_FILE="infrastructure/kubernetes/secrets-provisioner.yaml"
    if [ -f "$PROVISIONER_FILE" ]; then
        print_status "Secrets provisioner job configured" 0
    else
        print_status "Secrets provisioner job not found" 1
    fi
else
    print_status "Kubernetes secrets.yaml file not found" 1
fi

echo ""
echo "4. 📦 Checking Code Complexity Reduction..."
echo "=============================================="

VALIDATION_FILE="project/ai-integrations/utils/validation.util.ts"
METRICS_FILE="project/ai-integrations/utils/metrics.util.ts"

if [ -f "$VALIDATION_FILE" ]; then
    # Check for helper functions in validation
    if grep -q "validateDocumentType\|validatePriority\|validateIncludeSuggestions\|validateLanguage" "$VALIDATION_FILE"; then
        print_status "Validation utility refactored with helper functions" 0
    else
        print_status "Validation utility not refactored" 1
    fi
else
    print_status "Validation utility file not found" 1
fi

if [ -f "$METRICS_FILE" ]; then
    # Check for helper functions in metrics
    if grep -q "isClientError\|isServerError\|isTimeoutError\|isNetworkError" "$METRICS_FILE"; then
        print_status "Metrics utility refactored with helper functions" 0
    else
        print_status "Metrics utility not refactored" 1
    fi
else
    print_status "Metrics utility file not found" 1
fi

echo ""
echo "5. 📄 Checking Package Lock Management..."
echo "========================================="

# Check if root package-lock.json is removed
if [ ! -f "package-lock.json" ]; then
    print_status "Root package-lock.json removed" 0
else
    print_status "Root package-lock.json still present" 1
fi

# Check if package-lock.json is in .gitignore
if grep -q "package-lock.json" .gitignore; then
    print_status "package-lock.json added to .gitignore" 0
else
    print_status "package-lock.json not found in .gitignore" 1
fi

echo ""
echo "6. 🛡️ Checking Pod Security Policies..."
echo "======================================="

# Check backend security context
BACKEND_FILE="infrastructure/kubernetes/backend.yaml"
if [ -f "$BACKEND_FILE" ]; then
    if grep -q "runAsNonRoot.*true" "$BACKEND_FILE" && grep -q "allowPrivilegeEscalation.*false" "$BACKEND_FILE"; then
        print_status "Backend has secure security context" 0
    else
        print_status "Backend missing secure security context" 1
    fi
else
    print_status "Backend Kubernetes file not found" 1
fi

# Check frontend security context
FRONTEND_FILE="infrastructure/kubernetes/frontend.yaml"
if [ -f "$FRONTEND_FILE" ]; then
    if grep -q "runAsNonRoot.*true" "$FRONTEND_FILE" && grep -q "allowPrivilegeEscalation.*false" "$FRONTEND_FILE"; then
        print_status "Frontend has secure security context" 0
    else
        print_status "Frontend missing secure security context" 1
    fi
else
    print_status "Frontend Kubernetes file not found" 1
fi

# Check PostgreSQL security context
POSTGRES_FILE="infrastructure/kubernetes/postgres.yaml"
if [ -f "$POSTGRES_FILE" ]; then
    if grep -q "runAsNonRoot.*true" "$POSTGRES_FILE" && grep -q "allowPrivilegeEscalation.*false" "$POSTGRES_FILE"; then
        print_status "PostgreSQL has secure security context" 0
    else
        print_status "PostgreSQL missing secure security context" 1
    fi
else
    print_status "PostgreSQL Kubernetes file not found" 1
fi

# Check Redis security context
REDIS_FILE="infrastructure/kubernetes/redis.yaml"
if [ -f "$REDIS_FILE" ]; then
    if grep -q "runAsNonRoot.*true" "$REDIS_FILE" && grep -q "allowPrivilegeEscalation.*false" "$REDIS_FILE"; then
        print_status "Redis has secure security context" 0
    else
        print_status "Redis missing secure security context" 1
    fi
else
    print_status "Redis Kubernetes file not found" 1
fi

# Check Pod Security Policy
PSP_FILE="infrastructure/kubernetes/pod-security-policy.yaml"
if [ -f "$PSP_FILE" ]; then
    print_status "Pod Security Policy configured" 0
else
    print_status "Pod Security Policy not found" 1
fi

echo ""
echo "🎯 Summary"
echo "=========="

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}🎉 All security fixes have been successfully implemented!${NC}"
    echo ""
    echo "✅ GitHub Actions pinned to commit SHAs"
    echo "✅ Terraform database security enhanced"
    echo "✅ Load balancer configured for HTTPS"
    echo "✅ Public subnets secured"
    echo "✅ Kubernetes secrets hardening"
    echo "✅ Code complexity reduced"
    echo "✅ Package lock management improved"
    echo "✅ Pod security policies enforced"
    echo ""
    echo "🚀 The KitOps platform is now ready for secure deployment!"
    exit 0
else
    echo -e "${RED}❌ $FAILED_CHECKS security issues still need attention${NC}"
    echo ""
    echo "Please review the failed checks above and ensure all fixes are properly implemented."
    exit 1
fi