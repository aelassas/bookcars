# GitHub Secrets Configuration Guide

This document lists all the GitHub Secrets that need to be configured in your repository for the CI/CD pipeline to work.

## How to Add Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with the exact name listed below

## Required Secrets

### MongoDB Configuration

Choose **ONE** of the following options:

#### Option 1: Full MongoDB Connection String (Recommended)
- **Name**: `BC_DB_URI`
- **Value**: Full MongoDB connection string
  - Example: `mongodb://username:password@mongodb.mongodb.svc.cluster.local:27017/bookcars?authSource=admin&appName=bookcars`

#### Option 2: MongoDB Credentials (Alternative)
- **Name**: `BC_MONGO_USER`
- **Value**: MongoDB username (e.g., `admin`)
- **Name**: `BC_MONGO_PASS`
- **Value**: MongoDB password

**Note**: If neither `BC_DB_URI` nor both `BC_MONGO_USER` and `BC_MONGO_PASS` are provided, the workflow will attempt to retrieve credentials from the existing MongoDB secret in the cluster.

### Authentication

- **Name**: `BC_COOKIE_SECRET`
- **Value**: Cookie secret (at least 32 characters long)
  - Generate: `openssl rand -base64 32`

- **Name**: `BC_JWT_SECRET`
- **Value**: JWT secret (at least 32 characters long)
  - Generate: `openssl rand -base64 32`

- **Name**: `BC_AUTH_COOKIE_DOMAIN`
- **Value**: Cookie domain (e.g., `tokyodrivingclub.com`)

### SMTP Configuration

- **Name**: `BC_SMTP_HOST`
- **Value**: SMTP server hostname (e.g., `smtp.gmail.com`)

- **Name**: `BC_SMTP_PORT`
- **Value**: SMTP server port (e.g., `587`)

- **Name**: `BC_SMTP_USER`
- **Value**: SMTP username/email

- **Name**: `BC_SMTP_PASS`
- **Value**: SMTP password or app-specific password

- **Name**: `BC_SMTP_FROM`
- **Value**: Email address to send emails from

### Host Configuration

- **Name**: `BC_ADMIN_HOST`
- **Value**: Admin panel domain (e.g., `admin.tokyodrivingclub.com` or `tokyodrivingclub.com`)

- **Name**: `BC_FRONTEND_HOST`
- **Value**: Frontend domain (e.g., `tokyodrivingclub.com`)

## Optional Secrets

### Payment Gateways

- **Name**: `BC_STRIPE_SECRET_KEY`
- **Value**: Stripe secret key (if using Stripe)

- **Name**: `BC_STRIPE_WEBHOOK_SECRET`
- **Value**: Stripe webhook secret (if using Stripe webhooks)

- **Name**: `BC_PAYPAL_CLIENT_ID`
- **Value**: PayPal client ID (if using PayPal)

- **Name**: `BC_PAYPAL_CLIENT_SECRET`
- **Value**: PayPal client secret (if using PayPal)

- **Name**: `BC_PAYPAL_SANDBOX`
- **Value**: `true` or `false` (defaults to `true` if not provided)

### Other Optional Settings

- **Name**: `BC_ADMIN_EMAIL`
- **Value**: Admin email address

- **Name**: `BC_EXPO_ACCESS_TOKEN`
- **Value**: Expo push notification access token (if using mobile app)

- **Name**: `BC_RECAPTCHA_SECRET`
- **Value**: Google reCAPTCHA secret key (if using reCAPTCHA)

- **Name**: `BC_IPINFO_API_KEY`
- **Value**: IPInfo API key (for geolocation, required for >1000 requests/day)

- **Name**: `BC_ENABLE_SENTRY`
- **Value**: `true` or `false` (defaults to `false` if not provided)

- **Name**: `BC_SENTRY_DSN_BACKEND`
- **Value**: Sentry DSN for backend error tracking (required if `BC_ENABLE_SENTRY` is `true`)

## Kubernetes Configuration

- **Name**: `KUBECONFIG`
- **Value**: Base64-encoded kubeconfig file content
  - Generate: `cat ~/.kube/config | base64 -w 0` (Linux) or `cat ~/.kube/config | base64` (macOS)

## Quick Setup Script

You can use this script to generate random secrets for authentication:

```bash
#!/bin/bash
echo "BC_COOKIE_SECRET=$(openssl rand -base64 32)"
echo "BC_JWT_SECRET=$(openssl rand -base64 32)"
```

## Verification

After adding all secrets, you can verify the deployment by:

1. Pushing to the `main` branch, or
2. Manually triggering the workflow from the Actions tab

The workflow will fail with clear error messages if any required secrets are missing.

