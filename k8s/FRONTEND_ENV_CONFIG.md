# Frontend Environment Variables Configuration

This document explains how environment variables are configured for the frontend application in both build-time and runtime scenarios.

## Overview

The frontend is a Vite-based React application. Vite applications typically bake environment variables into the build at build time. However, we've configured the system to support:

1. **Build-time environment variables** - Passed during Docker image build (primary method)
2. **Runtime environment variables** - Available in the container (for logging/debugging, and potential future runtime config)

## Build-Time Configuration

### Dockerfile

The `frontend/Dockerfile` accepts all `VITE_BC_*` environment variables as build arguments (ARG). These are:
- Written to `.env` file during build
- Baked into the Vite build output
- Available in the application via `import.meta.env.VITE_BC_*`

### Supported Build Arguments

All environment variables from `frontend/src/config/env.config.ts` are supported:

**Core Configuration:**
- `VITE_BC_API_HOST` - API endpoint URL
- `VITE_BC_WEBSITE_NAME` - Website name
- `VITE_BC_DEFAULT_LANGUAGE` - Default language code
- `VITE_BC_BASE_CURRENCY` - Base currency code
- `VITE_NODE_ENV` - Node environment (production/development)

**Payment Gateways:**
- `VITE_BC_PAYMENT_GATEWAY` - Payment gateway (stripe/paypal)
- `VITE_BC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `VITE_BC_PAYPAL_CLIENT_ID` - PayPal client ID
- `VITE_BC_PAYPAL_DEBUG` - PayPal debug mode

**Pagination:**
- `VITE_BC_PAGE_SIZE` - Default page size
- `VITE_BC_CARS_PAGE_SIZE` - Cars page size
- `VITE_BC_BOOKINGS_PAGE_SIZE` - Bookings page size
- `VITE_BC_BOOKINGS_MOBILE_PAGE_SIZE` - Mobile bookings page size
- `VITE_BC_PAGINATION_MODE` - Pagination mode (CLASSIC/INFINITE_SCROLL)

**CDN Paths:**
- `VITE_BC_CDN_USERS` - Users CDN path
- `VITE_BC_CDN_CARS` - Cars CDN path
- `VITE_BC_CDN_LOCATIONS` - Locations CDN path
- `VITE_BC_CDN_LICENSES` - Licenses CDN path
- `VITE_BC_CDN_TEMP_LICENSES` - Temp licenses CDN path

**Image Dimensions:**
- `VITE_BC_SUPPLIER_IMAGE_WIDTH` - Supplier image width
- `VITE_BC_SUPPLIER_IMAGE_HEIGHT` - Supplier image height
- `VITE_BC_CAR_IMAGE_WIDTH` - Car image width
- `VITE_BC_CAR_IMAGE_HEIGHT` - Car image height

**reCAPTCHA:**
- `VITE_BC_RECAPTCHA_ENABLED` - Enable reCAPTCHA (true/false)
- `VITE_BC_RECAPTCHA_SITE_KEY` - reCAPTCHA site key

**Other Settings:**
- `VITE_BC_MINIMUM_AGE` - Minimum age requirement
- `VITE_BC_SET_LANGUAGE_FROM_IP` - Set language from IP (true/false)
- `VITE_BC_GOOGLE_ANALYTICS_ENABLED` - Enable Google Analytics (true/false)
- `VITE_BC_GOOGLE_ANALYTICS_ID` - Google Analytics ID
- `VITE_BC_CONTACT_EMAIL` - Contact email
- `VITE_BC_DEPOSIT_FILTER_VALUE_1` - Deposit filter value 1
- `VITE_BC_DEPOSIT_FILTER_VALUE_2` - Deposit filter value 2
- `VITE_BC_DEPOSIT_FILTER_VALUE_3` - Deposit filter value 3
- `VITE_BC_FB_APP_ID` - Facebook App ID
- `VITE_BC_APPLE_ID` - Apple ID
- `VITE_BC_GG_APP_ID` - Google App ID
- `VITE_BC_MIN_LOCATIONS` - Minimum locations
- `VITE_BC_HIDE_SUPPLIERS` - Hide suppliers (true/false)
- `VITE_BC_MAP_LATITUDE` - Map default latitude
- `VITE_BC_MAP_LONGITUDE` - Map default longitude
- `VITE_BC_MAP_ZOOM` - Map default zoom level

## Runtime Configuration

### Kubernetes Deployment

The `k8s/frontend/deployment.yaml` loads environment variables from:
- **ConfigMap** (`bookcars-config`) - Non-sensitive configuration
- **Secrets** (`bookcars-secrets`) - Sensitive data (API keys, etc.)

### ConfigMap

The `k8s/configmap.yml` includes default values for all frontend environment variables. These are:
- Used as defaults if build-time args are not provided
- Available in the container at runtime
- Can be updated without rebuilding the image (though Vite apps won't use them unless runtime injection is implemented)

### Runtime Environment Variables

Runtime env vars are available in the container via:
- `envFrom` in the Kubernetes deployment
- Logged by the `docker-entrypoint.sh` script for debugging

**Note:** Since Vite apps bake env vars at build time, runtime env vars won't affect the running application unless you implement a runtime configuration mechanism in your app code.

## CI/CD Configuration

### GitHub Actions Workflow

The `.github/workflows/deploy.yml` workflow:
1. Reads frontend env vars from GitHub Secrets
2. Passes them as build arguments during Docker build
3. Builds the frontend image with all env vars baked in

### Required GitHub Secrets

Add these secrets to your GitHub repository for frontend builds:

**Required:**
- `VITE_BC_API_HOST` - API endpoint URL

**Optional (with defaults in ConfigMap):**
- All other `VITE_BC_*` variables listed above

## Usage

### Setting Build-Time Variables

1. **Via GitHub Secrets** (recommended for CI/CD):
   - Add secrets in GitHub repository settings
   - They'll be passed as build args automatically

2. **Via Docker Build**:
   ```bash
   docker build \
     --build-arg VITE_BC_API_HOST=https://api.example.com \
     --build-arg VITE_BC_WEBSITE_NAME="My App" \
     -f frontend/Dockerfile \
     -t my-frontend:latest .
   ```

### Setting Runtime Variables

1. **Via ConfigMap**:
   ```bash
   kubectl edit configmap bookcars-config -n bookcars
   ```

2. **Via Secrets**:
   ```bash
   kubectl edit secret bookcars-secrets -n bookcars
   ```

3. **Via Deployment**:
   ```bash
   kubectl set env deployment/frontend -n bookcars \
     VITE_BC_API_HOST=https://new-api.example.com
   ```

## Important Notes

1. **Build-time is primary**: For Vite apps, build-time env vars are the primary method. Changes to runtime env vars won't affect the app unless you implement runtime config.

2. **Rebuild required**: To change most frontend configuration, you need to rebuild the Docker image with new build args.

3. **Sensitive data**: Use Kubernetes Secrets for sensitive data like API keys, not ConfigMaps.

4. **Default values**: Check `k8s/configmap.yml` for default values that will be used if build args are not provided.

## Troubleshooting

### Check build-time env vars
```bash
# Inspect the built image
docker run --rm my-frontend:latest env | grep VITE_BC_
```

### Check runtime env vars in Kubernetes
```bash
# Get pod name
kubectl get pods -n bookcars -l app=frontend

# Check env vars in pod
kubectl exec -n bookcars <pod-name> -- env | grep VITE_BC_
```

### View container logs
```bash
kubectl logs -n bookcars <pod-name> -f
```

The entrypoint script logs available environment variables at startup.
