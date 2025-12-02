# Kubernetes Deployment

This directory contains Kubernetes manifests for deploying BookCars to your cluster.

## Overview

The deployment consists of:
- **Backend**: Node.js API service
- **Frontend**: React frontend application (served via Nginx)
- **Admin**: React admin panel (served via Nginx)
- **MongoDB**: Uses existing MongoDB service in `mongodb` namespace
- **Ingress**: Routes traffic to services based on domain names

## Prerequisites

1. Kubernetes cluster with kubectl configured
2. NGINX Ingress Controller installed
3. cert-manager installed (for SSL certificates)
4. Existing MongoDB service in `mongodb` namespace
5. GitHub Secrets configured (see [GITHUB_SECRETS.md](./GITHUB_SECRETS.md))

## Quick Start

### 1. Configure GitHub Secrets

Add all required secrets to your GitHub repository:
- Go to **Settings** → **Secrets and variables** → **Actions**
- Add secrets as documented in [GITHUB_SECRETS.md](./GITHUB_SECRETS.md)

### 2. Deploy

The deployment happens automatically via GitHub Actions when you push to `main` branch, or you can trigger it manually.

### 3. Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
# Create namespace
kubectl create namespace bookcars

# Deploy ConfigMap
kubectl apply -f k8s/configmap.yml

# Create secret (you'll need to provide values)
kubectl create secret generic bookcars-secrets \
  --namespace=bookcars \
  --from-literal=BC_DB_URI="mongodb://..." \
  --from-literal=BC_COOKIE_SECRET="..." \
  # ... (add all other secrets)

# Deploy PVC
kubectl apply -f k8s/pvc.yaml

# Deploy services
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/admin/

# Deploy Ingress
kubectl apply -f k8s/ingress.yaml
```

## File Structure

```
k8s/
├── README.md                    # This file
├── GITHUB_SECRETS.md            # GitHub Secrets configuration guide
├── namespace.yml                # Namespace definition
├── configmap.yml                # Non-sensitive configuration
├── secret.yaml                  # Secret template (actual secrets from GitHub)
├── pvc.yaml                     # Persistent volume claim for CDN storage
├── ingress.yaml                 # Ingress configuration for domain routing
├── backend/
│   ├── deployment.yaml         # Backend deployment
│   └── service.yaml            # Backend service
├── frontend/
│   ├── deployment.yaml         # Frontend deployment
│   └── service.yaml            # Frontend service
├── admin/
│   ├── deployment.yaml         # Admin deployment
│   └── service.yaml            # Admin service
└── mongodb/                     # MongoDB manifests (not used - using existing MongoDB)
    ├── statefulset.yaml
    ├── service.yaml
    └── secret.yaml
```

## Configuration

### MongoDB Connection

The deployment uses the existing MongoDB service in the `mongodb` namespace. The connection string is configured via GitHub Secrets:

- Option 1: Provide `BC_DB_URI` with full connection string
- Option 2: Provide `BC_MONGO_USER` and `BC_MONGO_PASS` (workflow will construct URI)
- Option 3: Workflow will attempt to retrieve from existing MongoDB secret

### Storage

CDN files are stored in a PersistentVolumeClaim using `vultr-block-storage` (ReadWriteOnce). Since this storage class only supports single-pod access, the volume is mounted only on the backend pod. Frontend accesses CDN files through the backend service.

### Domain Configuration

Update the following files with your actual domains:

1. **k8s/secret.yaml** (documentation only):
   - `BC_ADMIN_HOST`
   - `BC_FRONTEND_HOST`
   - `BC_AUTH_COOKIE_DOMAIN`

2. **k8s/ingress.yaml**:
   - Replace `yourdomain.com` with your actual domain
   - Replace `admin.yourdomain.com` with your admin subdomain

3. **GitHub Secrets**:
   - `BC_ADMIN_HOST`
   - `BC_FRONTEND_HOST`
   - `BC_AUTH_COOKIE_DOMAIN`

## Verification

After deployment, verify everything is working:

```bash
# Check pods
kubectl get pods -n bookcars

# Check services
kubectl get svc -n bookcars

# Check ingress
kubectl get ingress -n bookcars

# View logs
kubectl logs -f deployment/backend -n bookcars
kubectl logs -f deployment/frontend -n bookcars
kubectl logs -f deployment/admin -n bookcars
```

## Troubleshooting

### Pods not starting

```bash
# Describe pod to see events
kubectl describe pod <pod-name> -n bookcars

# Check logs
kubectl logs <pod-name> -n bookcars
```

### Secret issues

```bash
# Check if secret exists
kubectl get secret bookcars-secrets -n bookcars

# View secret (values will be base64 encoded)
kubectl get secret bookcars-secrets -n bookcars -o yaml
```

### Ingress not working

```bash
# Check ingress status
kubectl describe ingress bookcars-ingress -n bookcars

# Verify ingress controller is running
kubectl get pods -n ingress-nginx
```

### MongoDB connection issues

```bash
# Test MongoDB connectivity from a pod
kubectl run -it --rm debug --image=mongo:latest --restart=Never -- mongosh "mongodb://mongodb.mongodb.svc.cluster.local:27017/bookcars?authSource=admin"
```

## Scaling

To scale services:

```bash
kubectl scale deployment backend -n bookcars --replicas=3
kubectl scale deployment frontend -n bookcars --replicas=3
kubectl scale deployment admin -n bookcars --replicas=2
```

## Updating

Updates are handled automatically via GitHub Actions when you push to `main`. The workflow will:

1. Build new Docker images
2. Push to GitHub Container Registry
3. Update Kubernetes deployments with new image tags
4. Wait for rollout to complete

## Security Notes

- All secrets are stored in GitHub Secrets, not in the repository
- Secrets are injected into Kubernetes at deployment time
- Never commit actual secret values to the repository
- Rotate secrets regularly
- Use strong, randomly generated values for `BC_COOKIE_SECRET` and `BC_JWT_SECRET`

