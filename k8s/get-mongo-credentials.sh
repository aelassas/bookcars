#!/bin/bash

set -e

echo "=== MongoDB Credentials from Kubernetes ==="
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ Error: kubectl is not installed or not in PATH"
    exit 1
fi

# Check if MongoDB secret exists (suppress error output)
if ! kubectl get secret mongodb -n mongodb &> /dev/null 2>&1; then
    echo "⚠️  Warning: Cannot access MongoDB secret (permission denied or secret doesn't exist)"
    echo ""
    echo "This script requires permissions to read secrets in the 'mongodb' namespace."
    echo ""
    echo "=== Alternative Methods ==="
    echo ""
    echo "Method 1: Ask cluster admin to run:"
    echo "  kubectl get secret mongodb -n mongodb -o json | jq -r '.data | to_entries[] | \"\(.key): \\(.value | @base64d)\"'"
    echo ""
    echo "Method 2: If MongoDB was deployed via Helm, check Helm values:"
    echo "  helm get values mongodb -n mongodb"
    echo ""
    echo "Method 3: Check MongoDB deployment/statefulset for environment variables:"
    echo "  kubectl get deployment mongodb -n mongodb -o yaml | grep -A 10 env:"
    echo "  kubectl get statefulset mongodb -n mongodb -o yaml | grep -A 10 env:"
    echo ""
    echo "Method 4: Connect to MongoDB pod and check:"
    echo "  kubectl exec -it <mongodb-pod-name> -n mongodb -- mongosh --eval 'db.getUsers()'"
    echo ""
    exit 1
fi

echo "📋 MongoDB Secret Keys:"
kubectl get secret mongodb -n mongodb -o jsonpath='{.data}' | jq -r 'keys[]' | sort
echo ""

# Try to get username from common key names
MONGO_USER=""
MONGO_PASS=""

# Try different possible key names for username
for key in mongodb-root-username mongodb-username username root-username; do
    if kubectl get secret mongodb -n mongodb -o jsonpath="{.data.$key}" &> /dev/null; then
        MONGO_USER=$(kubectl get secret mongodb -n mongodb -o jsonpath="{.data.$key}" | base64 -d 2>/dev/null || echo "")
        if [ -n "$MONGO_USER" ]; then
            echo "✅ Found username in key: $key"
            break
        fi
    fi
done

# Try different possible key names for password
for key in mongodb-root-password mongodb-password password root-password; do
    if kubectl get secret mongodb -n mongodb -o jsonpath="{.data.$key}" &> /dev/null; then
        MONGO_PASS=$(kubectl get secret mongodb -n mongodb -o jsonpath="{.data.$key}" | base64 -d 2>/dev/null || echo "")
        if [ -n "$MONGO_PASS" ]; then
            echo "✅ Found password in key: $key"
            break
        fi
    fi
done

echo ""
echo "=== Decoded Values ==="

# Show all keys and their decoded values
echo "All secret keys and values:"
kubectl get secret mongodb -n mongodb -o json | jq -r '.data | to_entries[] | "\(.key): \(.value | @base64d)"' | while IFS= read -r line; do
    key=$(echo "$line" | cut -d: -f1)
    value=$(echo "$line" | cut -d: -f2- | sed 's/^ //')
    # Mask password values
    if [[ "$key" == *"password"* ]] || [[ "$key" == *"Password"* ]] || [[ "$key" == *"PASS"* ]]; then
        echo "$key: [HIDDEN - ${#value} characters]"
    else
        echo "$key: $value"
    fi
done

echo ""
echo "=== MongoDB Credentials ==="
if [ -n "$MONGO_USER" ] && [ -n "$MONGO_PASS" ]; then
    echo "Username: $MONGO_USER"
    echo "Password: [HIDDEN - ${#MONGO_PASS} characters]"
    echo ""
    echo "=== MongoDB Connection String ==="
    echo "mongodb://$MONGO_USER:$MONGO_PASS@mongodb.mongodb.svc.cluster.local:27017/bookcars?authSource=admin&appName=bookcars"
    echo ""
    echo "=== For GitHub Secret BC_DB_URI ==="
    echo "mongodb://$MONGO_USER:$MONGO_PASS@mongodb.mongodb.svc.cluster.local:27017/bookcars?authSource=admin&appName=bookcars"
    echo ""
    echo "=== Or use separate secrets ==="
    echo "BC_MONGO_USER=$MONGO_USER"
    echo "BC_MONGO_PASS=$MONGO_PASS"
else
    echo "⚠️  Warning: Could not automatically determine username/password"
    echo ""
    echo "Please check the secret keys above and manually construct the connection string."
    echo ""
    echo "To view all keys:"
    echo "  kubectl get secret mongodb -n mongodb -o json | jq '.data | keys'"
    echo ""
    echo "To decode a specific key:"
    echo "  kubectl get secret mongodb -n mongodb -o jsonpath='{.data.KEY_NAME}' | base64 -d"
fi

echo ""
echo "=== MongoDB Service Info ==="
kubectl get svc mongodb -n mongodb -o wide
