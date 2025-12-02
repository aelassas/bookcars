#!/bin/bash

# This script should be run by a cluster admin or user with secret read permissions
# It extracts MongoDB credentials from Kubernetes secret

set -e

echo "=== MongoDB Credentials Extraction (Admin Script) ==="
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ Error: kubectl is not installed or not in PATH"
    exit 1
fi

# Check if MongoDB secret exists
if ! kubectl get secret mongodb -n mongodb &> /dev/null; then
    echo "❌ Error: MongoDB secret not found in 'mongodb' namespace"
    echo ""
    echo "Available secrets in mongodb namespace:"
    kubectl get secrets -n mongodb 2>&1 || echo "Cannot list secrets (permission issue)"
    exit 1
fi

echo "📋 Extracting MongoDB credentials..."
echo ""

# Get all secret data
SECRET_DATA=$(kubectl get secret mongodb -n mongodb -o json)

# Try to find username
MONGO_USER=""
for key in mongodb-root-username mongodb-username username root-username; do
    VALUE=$(echo "$SECRET_DATA" | jq -r ".data.\"$key\" // empty" 2>/dev/null)
    if [ -n "$VALUE" ] && [ "$VALUE" != "null" ]; then
        MONGO_USER=$(echo "$VALUE" | base64 -d 2>/dev/null || echo "")
        if [ -n "$MONGO_USER" ]; then
            echo "✅ Found username in key: $key"
            break
        fi
    fi
done

# If username not found but mongodb-root-password exists, default to "root" (MongoDB Helm chart default)
if [ -z "$MONGO_USER" ]; then
    ROOT_PASS_KEY=$(echo "$SECRET_DATA" | jq -r '.data | keys[]' | grep -i "root-password" | head -1)
    if [ -n "$ROOT_PASS_KEY" ]; then
        MONGO_USER="root"
        echo "✅ Using default MongoDB root username: root"
    fi
fi

# Try to find password
MONGO_PASS=""
for key in mongodb-root-password mongodb-password password root-password; do
    VALUE=$(echo "$SECRET_DATA" | jq -r ".data.\"$key\" // empty" 2>/dev/null)
    if [ -n "$VALUE" ] && [ "$VALUE" != "null" ]; then
        MONGO_PASS=$(echo "$VALUE" | base64 -d 2>/dev/null || echo "")
        if [ -n "$MONGO_PASS" ]; then
            echo "✅ Found password in key: $key"
            break
        fi
    fi
done

# If username not found but mongodb-root-password exists, default to "root" (MongoDB Helm chart default)
if [ -z "$MONGO_USER" ]; then
    ROOT_PASS_KEY=$(echo "$SECRET_DATA" | jq -r '.data | keys[]' | grep -i "root-password" | head -1)
    if [ -n "$ROOT_PASS_KEY" ]; then
        MONGO_USER="root"
        echo "✅ Using default MongoDB root username: root (MongoDB Helm chart default)"
    fi
fi

echo ""
echo "=== All Secret Keys ==="
echo "$SECRET_DATA" | jq -r '.data | keys[]' | sort
echo ""

echo "=== Decoded Values (Passwords Hidden) ==="
echo "$SECRET_DATA" | jq -r '.data | to_entries[] | "\(.key): \(.value | @base64d)"' | while IFS= read -r line; do
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
    CONN_STRING="mongodb://$MONGO_USER:$MONGO_PASS@mongodb.mongodb.svc.cluster.local:27017/bookcars?authSource=admin&appName=bookcars"
    echo "$CONN_STRING"
    echo ""
    echo "=== For GitHub Secret BC_DB_URI ==="
    echo "$CONN_STRING"
    echo ""
    echo "=== Or use separate secrets ==="
    echo "BC_MONGO_USER=$MONGO_USER"
    echo "BC_MONGO_PASS=$MONGO_PASS"
    echo ""
    echo "=== Copy to Clipboard (macOS) ==="
    echo "echo '$CONN_STRING' | pbcopy"
    echo ""
    echo "✅ Credentials extracted successfully!"
else
    echo "⚠️  Warning: Could not automatically determine username/password"
    echo ""
    echo "Please check the secret keys above and manually construct the connection string."
    echo ""
    echo "To view a specific key:"
    echo "  kubectl get secret mongodb -n mongodb -o jsonpath='{.data.KEY_NAME}' | base64 -d"
    echo ""
    echo "Common key names to check:"
    echo "  - mongodb-root-username"
    echo "  - mongodb-root-password"
    echo "  - mongodb-username"
    echo "  - mongodb-password"
    echo "  - username"
    echo "  - password"
fi

echo ""
echo "=== MongoDB Service Info ==="
kubectl get svc mongodb -n mongodb -o wide

