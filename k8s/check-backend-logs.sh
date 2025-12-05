#!/bin/bash

# Script to check backend pod logs
# Run with: bash k8s/check-backend-logs.sh

NAMESPACE="bookcars"
APP_LABEL="app=backend"

echo "=== Backend Pod Logs ==="
echo ""

# Get the running pod (if any)
RUNNING_POD=$(kubectl get pods -n $NAMESPACE -l $APP_LABEL -o jsonpath='{.items[?(@.status.phase=="Running")].metadata.name}' 2>/dev/null | awk '{print $1}')

if [ -n "$RUNNING_POD" ]; then
    echo "📋 Current logs from running pod: $RUNNING_POD"
    echo "----------------------------------------"
    kubectl logs $RUNNING_POD -n $NAMESPACE --tail=100
    echo ""
    
    echo "📋 Previous logs (if pod crashed): $RUNNING_POD"
    echo "----------------------------------------"
    kubectl logs $RUNNING_POD -n $NAMESPACE --previous --tail=100 2>/dev/null || echo "No previous logs"
    echo ""
    
    echo "📋 All logs (last 200 lines): $RUNNING_POD"
    echo "----------------------------------------"
    kubectl logs $RUNNING_POD -n $NAMESPACE --tail=200
else
    echo "⚠️  No running backend pods found"
    echo ""
    echo "Available pods:"
    kubectl get pods -n $NAMESPACE -l $APP_LABEL
    echo ""
    echo "Trying to get logs from any pod..."
    ANY_POD=$(kubectl get pods -n $NAMESPACE -l $APP_LABEL -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [ -n "$ANY_POD" ]; then
        echo "Attempting logs from: $ANY_POD"
        kubectl logs $ANY_POD -n $NAMESPACE --tail=100 2>&1 || echo "Could not retrieve logs"
    fi
fi

echo ""
echo "=== Check for common errors ==="
if [ -n "$RUNNING_POD" ]; then
    echo "Searching for errors in logs..."
    kubectl logs $RUNNING_POD -n $NAMESPACE --tail=500 | grep -i "error\|exception\|failed\|crash" | tail -20 || echo "No obvious errors found"
fi


