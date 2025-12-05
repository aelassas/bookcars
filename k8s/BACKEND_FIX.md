# Backend Pod Restart Issues - Root Causes and Fixes

## Issues Identified

### 1. PVC Mount Conflict (CRITICAL)
**Problem**: `cdn-pvc` uses `ReadWriteOnce` access mode, which only allows ONE pod to mount it at a time. With `replicas: 2`, the second pod gets stuck in `ContainerCreating` state.

**Evidence**:
- Pods stuck in `ContainerCreating` for 88+ minutes
- Multiple pods trying to mount the same PVC
- PVC access mode: `ReadWriteOnce`

**Fix Applied**: Reduced replicas to 1 temporarily

**Long-term Solutions**:
1. **Use NFS or shared storage** (Recommended)
   - Deploy NFS server or use managed NFS
   - Change PVC to use NFS storage class with `ReadWriteMany`
   
2. **Use object storage** (S3-compatible)
   - Store CDN files in S3/MinIO
   - Backend serves via presigned URLs or proxy

3. **Single backend pod with horizontal pod autoscaler**
   - Keep 1 replica but scale based on CPU/memory
   - Accept that CDN files are on one pod

### 2. Pod Restarting (22 restarts)
**Problem**: Application is crashing repeatedly

**Possible Causes**:
- Database connection failures
- Missing environment variables
- Application startup errors
- Health check failures

**To Debug** (run with proper permissions):
```bash
# Check logs from the running pod
kubectl logs backend-7bdc694b8d-l7qkd -n bookcars --tail=200

# Check previous logs (if crashed)
kubectl logs backend-7bdc694b8d-l7qkd -n bookcars --previous --tail=200

# Check events
kubectl get events -n bookcars --sort-by='.lastTimestamp' | grep backend
```

**Common Fixes**:
1. Verify `BC_DB_URI` is correct in secrets
2. Check all required environment variables are set
3. Verify MongoDB is accessible from the pod
4. Check application logs for specific errors

## Immediate Actions Taken

1. ✅ Reduced backend replicas to 1 (fixes PVC mount issue)
2. ✅ Added health check endpoint (`/api/health`)
3. ✅ Adjusted probe timings
4. ✅ Moved health endpoint before middleware

## Next Steps

1. **Monitor the single pod**:
   ```bash
   kubectl get pods -n bookcars -l app=backend -w
   ```

2. **Check logs** once pod is running:
   ```bash
   kubectl logs -n bookcars -l app=backend --tail=100 -f
   ```

3. **If pod still restarts**, check:
   - Database connectivity
   - Environment variables
   - Application errors in logs

4. **For production**, implement shared storage solution (NFS or S3)

## Testing Database Connection

Once pod is running, test MongoDB connection:
```bash
POD_NAME=$(kubectl get pods -n bookcars -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec $POD_NAME -n bookcars -- wget -q -O- http://mongodb.mongodb.svc.cluster.local:27017
```

## Scaling Backend Later

When you implement shared storage (NFS/ReadWriteMany):
1. Change PVC to use NFS storage class
2. Update deployment replicas back to 2+
3. Ensure all pods can mount the shared volume


