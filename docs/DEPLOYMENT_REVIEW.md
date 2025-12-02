# Deployment Configuration Review

This document reviews the complete CI/CD pipeline to ensure all components work together correctly.

## ✅ 1. Code Changes Trigger GitHub Actions

**Status**: ✅ Configured correctly

- **File**: `.github/workflows/deploy.yml`
- **Trigger**: 
  - On push to `main` branch (line 4-6)
  - Manual trigger via `workflow_dispatch` (line 7)
- **Verification**: ✅ Correctly configured

## ✅ 2. GitHub Actions Builds Docker Images

**Status**: ✅ Configured correctly

### Backend Image
- **Build Step**: Lines 34-44
- **Context**: `.` (repository root)
- **Dockerfile**: `./backend/Dockerfile`
- **Tags**: 
  - `ghcr.io/{owner}/bookcars-backend:{sha}`
  - `ghcr.io/{owner}/bookcars-backend:latest`
- **Registry**: GitHub Container Registry (ghcr.io)
- **Build-time Env**: Uses `.env.docker` file (no build args needed)

### Frontend Image
- **Build Step**: Lines 46-58
- **Context**: `.` (repository root)
- **Dockerfile**: `./frontend/Dockerfile`
- **Tags**: 
  - `ghcr.io/{owner}/bookcars-frontend:{sha}`
  - `ghcr.io/{owner}/bookcars-frontend:latest`
- **Build Args**: 
  - `VITE_BC_API_HOST` (optional - can be empty for relative paths)
  - `VITE_BC_WEBSITE_NAME` (optional)
  - `VITE_BC_DEFAULT_LANGUAGE` (optional)
  - `VITE_BC_BASE_CURRENCY` (optional)
  - `VITE_BC_STRIPE_PUBLISHABLE_KEY` (optional)
  - `VITE_BC_PAYPAL_CLIENT_ID` (optional)

### Admin Image
- **Build Step**: Lines 60-72
- **Context**: `.` (repository root)
- **Dockerfile**: `./admin/Dockerfile`
- **Tags**: 
  - `ghcr.io/{owner}/bookcars-admin:{sha}`
  - `ghcr.io/{owner}/bookcars-admin:latest`
- **Build Args**: 
  - `VITE_BC_API_HOST` (optional - can be empty for relative paths)
  - `VITE_BC_WEBSITE_NAME` (optional)
  - `VITE_BC_DEFAULT_LANGUAGE` (optional)

## ✅ 3. Build-Time Environment Variables

**Status**: ✅ Configured correctly

### Source: GitHub Secrets
- Build-time env vars are passed as Docker build arguments
- If not provided, Dockerfiles fall back to `.env.docker` files
- Build args are optional - defaults are handled in code

### Required GitHub Secrets for Build:
- **Optional**: `VITE_BC_API_HOST` - API host (empty = relative paths)
- **Optional**: `VITE_BC_WEBSITE_NAME` - Website name
- **Optional**: `VITE_BC_DEFAULT_LANGUAGE` - Default language
- **Optional**: `VITE_BC_BASE_CURRENCY` - Base currency
- **Optional**: `VITE_BC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- **Optional**: `VITE_BC_PAYPAL_CLIENT_ID` - PayPal client ID

**Note**: Since frontend/admin use relative API paths when `VITE_BC_API_HOST` is empty, and nginx handles routing, these are optional.

## ✅ 4. Runtime Environment Variables

**Status**: ✅ Configured correctly

### Source: Kubernetes Secrets and ConfigMaps

#### ConfigMap (`k8s/configmap.yml`)
- Non-sensitive configuration
- Applied at: Line 128-130
- Contains:
  - `BC_PORT`: "3000"
  - `BC_WEBSITE_NAME`: "BookCars"
  - `BC_DEFAULT_LANGUAGE`: "en"
  - `BC_MINIMUM_AGE`: "21"
  - `BC_BATCH_SIZE`: "1000"
  - CDN paths
  - `BC_TIMEZONE`: "UTC"
  - `BC_IPINFO_DEFAULT_COUNTRY`: "US"

#### Secret (`bookcars-secrets`)
- Sensitive configuration
- Created from GitHub Secrets at: Lines 132-274
- Contains all runtime secrets (see `k8s/GITHUB_SECRETS.md`)

#### Deployment Configuration

**Backend** (`k8s/backend/deployment.yaml`):
- **Lines 24-28**: Uses `envFrom` to load from ConfigMap and Secret
- ✅ Correctly configured

**Frontend** (`k8s/frontend/deployment.yaml`):
- Static files (no runtime env vars needed)
- ✅ Correctly configured

**Admin** (`k8s/admin/deployment.yaml`):
- Static files (no runtime env vars needed)
- ✅ Correctly configured

## ✅ 5. Docker Images Deployed to Kubernetes

**Status**: ✅ Configured correctly

### Image Tag Updates
- **Step**: Lines 113-122
- Updates image tags in deployment manifests:
  - `IMAGE_REGISTRY-backend:IMAGE_TAG` → `ghcr.io/{owner}/bookcars-backend:{sha}`
  - `IMAGE_REGISTRY-frontend:IMAGE_TAG` → `ghcr.io/{owner}/bookcars-frontend:{sha}`
  - `IMAGE_REGISTRY-admin:IMAGE_TAG` → `ghcr.io/{owner}/bookcars-admin:{sha}`

### Deployment Steps
1. **Namespace**: Created at lines 124-126
2. **ConfigMap**: Applied at lines 128-130
3. **Secret**: Created at lines 132-274
4. **PVC**: Applied at lines 276-278
5. **Backend**: Applied at lines 280-282
6. **Frontend**: Applied at lines 284-286
7. **Admin**: Applied at lines 288-290
8. **Ingress**: Applied at lines 292-294

### Image Pull Configuration
- **Backend**: `imagePullPolicy: Always` (line 21)
- **Frontend**: `imagePullPolicy: Always` (line 21)
- **Admin**: `imagePullPolicy: Always` (line 21)

**Note**: If GitHub Container Registry requires authentication, you may need to add `imagePullSecrets`. Currently, public images don't require this, but if you make them private, add:

```yaml
imagePullSecrets:
  - name: ghcr-secret
```

## 🔍 Verification Checklist

### Pre-Deployment
- [ ] All required GitHub Secrets are configured (see `k8s/GITHUB_SECRETS.md`)
- [ ] `KUBECONFIG` secret is base64-encoded and added to GitHub Secrets
- [ ] Domain names updated in `k8s/ingress.yaml`
- [ ] Domain names match in GitHub Secrets (`BC_ADMIN_HOST`, `BC_FRONTEND_HOST`)

### During Deployment
- [ ] GitHub Actions workflow triggers on push to main
- [ ] Docker images build successfully
- [ ] Images are pushed to GitHub Container Registry
- [ ] Kubernetes secret is created successfully
- [ ] Deployments are updated with new image tags
- [ ] Rollout completes successfully

### Post-Deployment
- [ ] Pods are running: `kubectl get pods -n bookcars`
- [ ] Services are accessible: `kubectl get svc -n bookcars`
- [ ] Ingress is configured: `kubectl get ingress -n bookcars`
- [ ] Backend health check passes: `curl https://yourdomain.com/api/health`
- [ ] Frontend loads: `curl https://yourdomain.com`
- [ ] Admin loads: `curl https://admin.yourdomain.com`

## 📋 Required GitHub Secrets Summary

### Required (Runtime)
- `KUBECONFIG` - Base64-encoded kubeconfig
- `BC_DB_URI` or (`BC_MONGO_USER` + `BC_MONGO_PASS`)
- `BC_COOKIE_SECRET` - Random 32+ character string
- `BC_JWT_SECRET` - Random 32+ character string
- `BC_AUTH_COOKIE_DOMAIN` - Cookie domain
- `BC_SMTP_HOST`, `BC_SMTP_PORT`, `BC_SMTP_USER`, `BC_SMTP_PASS`, `BC_SMTP_FROM`
- `BC_ADMIN_HOST` - Admin domain
- `BC_FRONTEND_HOST` - Frontend domain

### Optional (Build-time)
- `VITE_BC_API_HOST` - API host (empty = relative paths)
- `VITE_BC_WEBSITE_NAME` - Website name
- `VITE_BC_DEFAULT_LANGUAGE` - Default language
- `VITE_BC_BASE_CURRENCY` - Base currency
- `VITE_BC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `VITE_BC_PAYPAL_CLIENT_ID` - PayPal client ID

### Optional (Runtime)
- Payment gateway secrets (Stripe, PayPal)
- `BC_ADMIN_EMAIL`
- `BC_EXPO_ACCESS_TOKEN`
- `BC_RECAPTCHA_SECRET`
- `BC_IPINFO_API_KEY`
- `BC_ENABLE_SENTRY`, `BC_SENTRY_DSN_BACKEND`

## 🚀 Deployment Flow

```
1. Code Push to main
   ↓
2. GitHub Actions Triggered
   ↓
3. Build Docker Images
   ├─ Backend (uses .env.docker)
   ├─ Frontend (build args from GitHub Secrets)
   └─ Admin (build args from GitHub Secrets)
   ↓
4. Push Images to GHCR
   ↓
5. Configure kubectl
   ↓
6. Get MongoDB Credentials
   ↓
7. Update Image Tags in Manifests
   ↓
8. Create/Update Kubernetes Resources
   ├─ Namespace
   ├─ ConfigMap
   ├─ Secret (from GitHub Secrets)
   ├─ PVC
   ├─ Backend Deployment
   ├─ Frontend Deployment
   ├─ Admin Deployment
   └─ Ingress
   ↓
9. Wait for Rollout
   ↓
10. Verify Deployment
```

## ✅ Summary

All components are correctly configured:

1. ✅ **Code changes trigger GitHub Actions** - Workflow triggers on push to main
2. ✅ **Docker images built** - All three services (backend, frontend, admin)
3. ✅ **Build-time env vars** - Passed as Docker build args from GitHub Secrets
4. ✅ **Runtime env vars** - Loaded from Kubernetes Secrets and ConfigMaps
5. ✅ **Images deployed** - Updated in deployments and rolled out to Kubernetes

The deployment pipeline is ready to use!

