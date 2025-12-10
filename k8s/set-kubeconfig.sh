#!/bin/bash

# Script to set/merge Vultr Kubernetes kubeconfig
# Usage: bash k8s/set-kubeconfig.sh <path-to-vultr-kubeconfig-file>

set -e

if [ -z "$1" ]; then
    echo "Usage: bash k8s/set-kubeconfig.sh <path-to-vultr-kubeconfig-file>"
    echo ""
    echo "Example:"
    echo "  bash k8s/set-kubeconfig.sh ~/Downloads/vultr-kubeconfig.yaml"
    echo "  bash k8s/set-kubeconfig.sh ./vultr-kubeconfig.yaml"
    exit 1
fi

KUBECONFIG_FILE="$1"

if [ ! -f "$KUBECONFIG_FILE" ]; then
    echo "❌ Error: File not found: $KUBECONFIG_FILE"
    exit 1
fi

echo "=== Setting Vultr Kubernetes Config ==="
echo ""

# Backup current config
if [ -f ~/.kube/config ]; then
    BACKUP_FILE=~/.kube/config.backup.$(date +%Y%m%d_%H%M%S)
    cp ~/.kube/config "$BACKUP_FILE"
    echo "✅ Backed up current config to: $BACKUP_FILE"
fi

# Option 1: Merge with existing config
echo ""
echo "Option 1: Merge with existing config (recommended)"
echo "This will add Vultr cluster to your existing kubeconfig"
read -p "Merge with existing config? (y/n): " MERGE

if [ "$MERGE" = "y" ] || [ "$MERGE" = "Y" ]; then
    # Merge configs
    KUBECONFIG=~/.kube/config:$KUBECONFIG_FILE kubectl config view --flatten > ~/.kube/config.merged
    mv ~/.kube/config.merged ~/.kube/config
    echo "✅ Merged Vultr config with existing config"
else
    # Replace config
    cp "$KUBECONFIG_FILE" ~/.kube/config
    echo "✅ Replaced kubeconfig with Vultr config"
fi

# Set correct permissions
chmod 600 ~/.kube/config

# Show available contexts
echo ""
echo "=== Available Contexts ==="
kubectl config get-contexts

# Try to find Vultr context
VULTR_CONTEXT=$(kubectl config get-contexts -o name | grep -i "vultr\|vke\|8147c003" | head -1)

if [ -n "$VULTR_CONTEXT" ]; then
    echo ""
    echo "Found Vultr context: $VULTR_CONTEXT"
    read -p "Switch to this context? (y/n): " SWITCH
    if [ "$SWITCH" = "y" ] || [ "$SWITCH" = "Y" ]; then
        kubectl config use-context "$VULTR_CONTEXT"
        echo "✅ Switched to Vultr context"
    fi
else
    echo ""
    echo "⚠️  Could not find Vultr context automatically"
    echo "Available contexts:"
    kubectl config get-contexts
    echo ""
    echo "To switch manually, run:"
    echo "  kubectl config use-context <context-name>"
fi

echo ""
echo "=== Current Context ==="
kubectl config current-context

echo ""
echo "=== Testing Connection ==="
kubectl cluster-info 2>&1 | head -3 || echo "⚠️  Could not connect (may need authentication)"

echo ""
echo "✅ Done! You can now use kubectl commands."

