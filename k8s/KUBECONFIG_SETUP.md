# Setting Up Vultr Kubernetes Kubeconfig

## Quick Setup

If you have the Vultr kubeconfig file:

```bash
bash k8s/set-kubeconfig.sh <path-to-vultr-kubeconfig-file>
```

Example:
```bash
bash k8s/set-kubeconfig.sh ~/Downloads/vultr-kubeconfig.yaml
```

## Manual Setup

### Option 1: Merge with Existing Config (Recommended)

This keeps your existing clusters and adds Vultr:

```bash
# Merge configs
KUBECONFIG=~/.kube/config:/path/to/vultr-kubeconfig.yaml kubectl config view --flatten > ~/.kube/config.merged
mv ~/.kube/config.merged ~/.kube/config
chmod 600 ~/.kube/config

# List contexts
kubectl config get-contexts

# Switch to Vultr context
kubectl config use-context vke-8147c003-8e4f-4f74-8358-bf7d2a2455bf
```

### Option 2: Replace Config (If you only need Vultr)

```bash
# Backup current config
cp ~/.kube/config ~/.kube/config.backup

# Copy Vultr config
cp /path/to/vultr-kubeconfig.yaml ~/.kube/config
chmod 600 ~/.kube/config
```

### Option 3: Use KUBECONFIG Environment Variable

```bash
# Set environment variable (temporary, for current session)
export KUBECONFIG=/path/to/vultr-kubeconfig.yaml

# Or use both
export KUBECONFIG=~/.kube/config:/path/to/vultr-kubeconfig.yaml
```

## Finding Your Vultr Kubeconfig

### From Vultr Dashboard:
1. Log into Vultr Dashboard
2. Go to **Kubernetes** → Your Cluster
3. Click **Download Config** or **View Config**
4. Save the file (usually `kubeconfig.yaml` or similar)

### From Vultr CLI:
```bash
vultr-cli kubernetes config <cluster-id>
```

## Verifying Setup

After setting up, verify:

```bash
# Check current context
kubectl config current-context

# Should show: vke-8147c003-8e4f-4f74-8358-bf7d2a2455bf

# Test connection
kubectl cluster-info

# List namespaces (if you have permissions)
kubectl get namespaces
```

## Switching Between Clusters

```bash
# List all contexts
kubectl config get-contexts

# Switch to Vultr
kubectl config use-context vke-8147c003-8e4f-4f74-8358-bf7d2a2455bf

# Switch to another cluster
kubectl config use-context <context-name>
```

## Current Issue

Your current context is pointing to:
- **GKE cluster**: `gke_app-production-406108_us-central1_drug-discovery-production`

But you need:
- **Vultr cluster**: `vke-8147c003-8e4f-4f74-8358-bf7d2a2455bf`

## After Setting Correct Config

Once you've set the Vultr kubeconfig and switched contexts, you can:

1. **Get the ingress IP**:
   ```bash
   kubectl get svc -n ingress-nginx ingress-nginx-controller
   ```

2. **Check your deployments**:
   ```bash
   kubectl get pods -n bookcars
   ```

3. **Get cluster IP for DNS**:
   ```bash
   bash k8s/get-cluster-ip.sh
   ```

