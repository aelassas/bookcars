#!/bin/bash

# Script to get Kubernetes cluster IP addresses for DNS configuration
# Run with: bash k8s/get-cluster-ip.sh

echo "=== Kubernetes Cluster IP Addresses for DNS ==="
echo ""

echo "1. Ingress Controller Service (LoadBalancer):"
echo "----------------------------------------"
kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null && echo "" || \
kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null && echo "" || \
echo "Checking alternative ingress controller namespaces..."

# Try common ingress controller namespaces
for ns in ingress-nginx kube-system default; do
    echo ""
    echo "Checking namespace: $ns"
    kubectl get svc -n $ns 2>/dev/null | grep -i "ingress\|nginx\|loadbalancer" | head -5
done

echo ""
echo "2. All LoadBalancer Services:"
echo "----------------------------------------"
kubectl get svc --all-namespaces -o wide | grep LoadBalancer || echo "No LoadBalancer services found"

echo ""
echo "3. Node External IPs:"
echo "----------------------------------------"
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.addresses[?(@.type=="ExternalIP")].address}{"\n"}{end}' 2>/dev/null || \
kubectl get nodes -o wide 2>/dev/null | head -10

echo ""
echo "4. Ingress Resource Status:"
echo "----------------------------------------"
kubectl get ingress -n bookcars -o wide 2>/dev/null || echo "Cannot access ingress (permission issue or not deployed)"

echo ""
echo "5. Vultr Kubernetes External IP (if using Vultr):"
echo "----------------------------------------"
# Vultr K8s clusters often expose via LoadBalancer
kubectl get svc --all-namespaces -o jsonpath='{range .items[?(@.spec.type=="LoadBalancer")]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.status.loadBalancer.ingress[0].ip}{"\n"}{end}' 2>/dev/null

echo ""
echo "=== DNS Configuration Instructions ==="
echo ""
echo "Once you have the IP address above, configure your DNS records:"
echo ""
echo "A Record:"
echo "  Name: @ (or yourdomain.com)"
echo "  Value: <IP_ADDRESS_FROM_ABOVE>"
echo "  TTL: 300 (or default)"
echo ""
echo "A Record:"
echo "  Name: admin (or admin.yourdomain.com)"
echo "  Value: <SAME_IP_ADDRESS>"
echo "  TTL: 300 (or default)"
echo ""
echo "Note: Both domains should point to the same IP (the ingress controller LoadBalancer IP)"
echo ""

