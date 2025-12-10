# DNS Configuration Guide

## Getting the Kubernetes Cluster IP Address

Run the script to get the IP address:
```bash
bash k8s/get-cluster-ip.sh
```

Or manually run:
```bash
# Get LoadBalancer IP (most common)
kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Or check all LoadBalancer services
kubectl get svc --all-namespaces | grep LoadBalancer

# Or get node external IPs
kubectl get nodes -o wide
```

## DNS Records to Configure

Once you have the IP address, configure these DNS records:

### Option 1: Root Domain + Subdomain (Recommended)

**A Record for Root Domain:**
```
Type: A
Name: @ (or leave blank, or yourdomain.com)
Value: <KUBERNETES_INGRESS_IP>
TTL: 300 (or default)
```

**A Record for Admin Subdomain:**
```
Type: A
Name: admin
Value: <SAME_KUBERNETES_INGRESS_IP>
TTL: 300 (or default)
```

This will create:
- `yourdomain.com` → Frontend
- `admin.yourdomain.com` → Admin Panel

### Option 2: Separate Domains

If you want separate domains:

**Domain 1:**
```
Type: A
Name: @
Value: <KUBERNETES_INGRESS_IP>
```

**Domain 2:**
```
Type: A
Name: @
Value: <SAME_KUBERNETES_INGRESS_IP>
```

Then update `k8s/ingress.yaml` and GitHub Secrets accordingly.

## Finding the IP Address

### Method 1: Ingress Controller LoadBalancer (Most Common)

```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

Look for the `EXTERNAL-IP` column. If it shows `<pending>`, wait a few minutes for the cloud provider to assign an IP.

### Method 2: Check All LoadBalancer Services

```bash
kubectl get svc --all-namespaces | grep LoadBalancer
```

### Method 3: Node External IPs (If Using NodePort)

```bash
kubectl get nodes -o wide
```

Use the External IP of any node.

### Method 4: Vultr Kubernetes Specific

If using Vultr Kubernetes Engine (VKE):
```bash
# Check LoadBalancer services
kubectl get svc --all-namespaces -o wide | grep LoadBalancer

# The ingress controller should have an external IP
kubectl get svc -n ingress-nginx -o wide
```

## Verifying DNS Configuration

After configuring DNS, verify:

```bash
# Check DNS resolution
nslookup yourdomain.com
nslookup admin.yourdomain.com

# Or use dig
dig yourdomain.com +short
dig admin.yourdomain.com +short
```

Both should return the same IP address (your Kubernetes ingress IP).

## Common Issues

### 1. No External IP Assigned
**Symptom**: `<pending>` in EXTERNAL-IP
**Solution**: 
- Wait 2-5 minutes for cloud provider to assign IP
- Check if LoadBalancer service is properly configured
- Verify cloud provider supports LoadBalancer

### 2. DNS Not Propagating
**Symptom**: DNS lookup returns old IP or fails
**Solution**:
- Wait for DNS propagation (can take up to 48 hours, usually 5-30 minutes)
- Check TTL value (lower TTL = faster updates)
- Use `dig` or `nslookup` to check from different DNS servers

### 3. Ingress Not Working After DNS Setup
**Symptom**: DNS resolves but site doesn't load
**Solution**:
- Verify ingress is deployed: `kubectl get ingress -n bookcars`
- Check ingress controller logs
- Verify cert-manager is working (for SSL)
- Check ingress annotations are correct

## After DNS Configuration

1. **Update GitHub Secrets**:
   - `BC_ADMIN_HOST`: `admin.yourdomain.com`
   - `BC_FRONTEND_HOST`: `yourdomain.com`
   - `BC_AUTH_COOKIE_DOMAIN`: `yourdomain.com`

2. **Update Ingress**:
   - Replace `yourdomain.com` in `k8s/ingress.yaml` with your actual domain

3. **Redeploy**:
   - Push changes or trigger GitHub Actions workflow
   - The ingress will pick up the new domain configuration

4. **Verify SSL**:
   - cert-manager should automatically create SSL certificates
   - Check: `kubectl get certificate -n bookcars`

## Quick Reference Commands

```bash
# Get ingress IP
kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Check ingress status
kubectl get ingress -n bookcars

# Check certificates
kubectl get certificate -n bookcars

# Check ingress controller pods
kubectl get pods -n ingress-nginx
```

