# Getting MongoDB Credentials from Kubernetes

Since MongoDB is deployed in your Kubernetes cluster, you need to extract the credentials from the Kubernetes secret.

## Quick Method (If you have admin access)

Run the admin script:
```bash
bash k8s/get-mongo-credentials-admin.sh
```

## Manual Methods

### Method 1: Direct Secret Access (Requires permissions)

```bash
# View all secret keys
kubectl get secret mongodb -n mongodb -o json | jq '.data | keys'

# Get username (try different key names)
kubectl get secret mongodb -n mongodb -o jsonpath='{.data.mongodb-root-username}' | base64 -d
# OR
kubectl get secret mongodb -n mongodb -o jsonpath='{.data.mongodb-username}' | base64 -d

# Get password (try different key names)
kubectl get secret mongodb -n mongodb -o jsonpath='{.data.mongodb-root-password}' | base64 -d
# OR
kubectl get secret mongodb -n mongodb -o jsonpath='{.data.mongodb-password}' | base64 -d

# View all decoded values
kubectl get secret mongodb -n mongodb -o json | jq -r '.data | to_entries[] | "\(.key): \(.value | @base64d)"'
```

### Method 2: Check Helm Values (If deployed via Helm)

```bash
helm get values mongodb -n mongodb
```

Look for `auth.rootUsername` and `auth.rootPassword` or similar fields.

### Method 3: Check Deployment/StatefulSet Environment Variables

```bash
# Check deployment
kubectl get deployment mongodb -n mongodb -o yaml | grep -A 20 env:

# Check statefulset
kubectl get statefulset mongodb -n mongodb -o yaml | grep -A 20 env:
```

### Method 4: Connect to MongoDB Pod

```bash
# Get MongoDB pod name
kubectl get pods -n mongodb

# Connect to MongoDB shell
kubectl exec -it <mongodb-pod-name> -n mongodb -- mongosh

# Then in mongosh:
use admin
db.getUsers()
```

### Method 5: Check MongoDB ConfigMap (If credentials are there)

```bash
kubectl get configmap -n mongodb
kubectl get configmap <configmap-name> -n mongodb -o yaml
```

## Constructing the Connection String

Once you have the username and password, construct the connection string:

```
mongodb://<USERNAME>:<PASSWORD>@mongodb.mongodb.svc.cluster.local:27017/bookcars?authSource=admin&appName=bookcars
```

## For GitHub Secrets

Add this connection string as `BC_DB_URI` in GitHub Secrets, or add separately:
- `BC_MONGO_USER`: MongoDB username
- `BC_MONGO_PASS`: MongoDB password

The GitHub Actions workflow will automatically construct the connection string if you provide `BC_MONGO_USER` and `BC_MONGO_PASS` instead of `BC_DB_URI`.

## Common MongoDB Secret Key Names

MongoDB Helm charts and operators use different key names. Common ones include:

- `mongodb-root-username` / `mongodb-root-password`
- `mongodb-username` / `mongodb-password`
- `username` / `password`
- `root-username` / `root-password`
- `mongodb-replica-set-key` (for replica sets)

## Troubleshooting

### Permission Denied

If you get permission errors, you need to:
1. Ask your cluster admin to run the script
2. Request `secrets.get` permission for the `mongodb` namespace
3. Use one of the alternative methods above

### Secret Not Found

If the secret doesn't exist:
1. Check if MongoDB is deployed: `kubectl get pods -n mongodb`
2. Check all namespaces: `kubectl get secrets --all-namespaces | grep mongo`
3. MongoDB might be using a different secret name

### Empty Values

If decoded values are empty:
1. The secret might use different key names - check all keys
2. The secret might be in a different namespace
3. MongoDB might be configured differently

