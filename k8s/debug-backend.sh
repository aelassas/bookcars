#!/bin/bash

# Debug script for backend pod restarts
# Run with: bash k8s/debug-backend.sh

set -e

NAMESPACE="bookcars"
APP_LABEL="app=backend"

echo "=== Backend Pod Debugging ==="
echo ""

echo "1. Pod Status:"
echo "----------------------------------------"
kubectl get pods -n $NAMESPACE -l $APP_LABEL
echo ""

echo "2. Pod Details (showing restart count and status):"
echo "----------------------------------------"
kubectl get pods -n $NAMESPACE -l $APP_LABEL -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,RESTARTS:.status.containerStatuses[0].restartCount,READY:.status.containerStatuses[0].ready,AGE:.metadata.creationTimestamp
echo ""

echo "3. Recent Pod Events:"
echo "----------------------------------------"
POD_NAME=$(kubectl get pods -n $NAMESPACE -l $APP_LABEL -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
if [ -n "$POD_NAME" ]; then
    kubectl describe pod $POD_NAME -n $NAMESPACE | grep -A 20 "Events:"
else
    echo "No pods found"
fi
echo ""

echo "4. Pod Describe (full):"
echo "----------------------------------------"
if [ -n "$POD_NAME" ]; then
    kubectl describe pod $POD_NAME -n $NAMESPACE
else
    echo "No pods found"
fi
echo ""

echo "5. Current Pod Logs (last 50 lines):"
echo "----------------------------------------"
if [ -n "$POD_NAME" ]; then
    kubectl logs $POD_NAME -n $NAMESPACE --tail=50 || echo "Could not retrieve logs"
else
    echo "No pods found"
fi
echo ""

echo "6. Previous Pod Logs (if crashed):"
echo "----------------------------------------"
if [ -n "$POD_NAME" ]; then
    kubectl logs $POD_NAME -n $NAMESPACE --previous --tail=50 2>/dev/null || echo "No previous logs available"
else
    echo "No pods found"
fi
echo ""

echo "7. Container Status Details:"
echo "----------------------------------------"
if [ -n "$POD_NAME" ]; then
    kubectl get pod $POD_NAME -n $NAMESPACE -o jsonpath='{.status.containerStatuses[0]}' | jq '.' 2>/dev/null || kubectl get pod $POD_NAME -n $NAMESPACE -o jsonpath='{.status.containerStatuses[0]}'
else
    echo "No pods found"
fi
echo ""

echo "8. Check if health endpoint is accessible:"
echo "----------------------------------------"
if [ -n "$POD_NAME" ]; then
    echo "Attempting to curl health endpoint from within pod..."
    kubectl exec $POD_NAME -n $NAMESPACE -- wget -q -O- http://localhost:3000/api/health 2>/dev/null || echo "Health endpoint not accessible or pod not ready"
else
    echo "No pods found"
fi
echo ""

echo "9. Deployment Status:"
echo "----------------------------------------"
kubectl get deployment backend -n $NAMESPACE -o yaml | grep -A 10 "status:" || echo "Could not get deployment status"
echo ""

echo "10. Check ConfigMap and Secrets:"
echo "----------------------------------------"
kubectl get configmap bookcars-config -n $NAMESPACE -o yaml | grep -E "BC_PORT|BC_DB_URI" || echo "ConfigMap check failed"
echo ""

echo "=== Debugging Complete ==="
echo ""
echo "Common issues to check:"
echo "1. Health check failures - check liveness/readiness probe configuration"
echo "2. Application crashes - check logs for errors"
echo "3. Resource limits - check if OOMKilled"
echo "4. Database connection - check BC_DB_URI in secrets"
echo "5. Missing environment variables - check ConfigMap and Secrets"


