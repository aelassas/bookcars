# Debugging Backend Pod Restarts

## Quick Debug Commands

Run these commands to diagnose backend pod restart issues:

### 1. Check Pod Status
```bash
kubectl get pods -n bookcars -l app=backend
```

### 2. Check Restart Count
```bash
kubectl get pods -n bookcars -l app=backend -o custom-columns=NAME:.metadata.name,RESTARTS:.status.containerStatuses[0].restartCount,STATUS:.status.phase
```

### 3. Describe Pod (shows events and status)
```bash
POD_NAME=$(kubectl get pods -n bookcars -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl describe pod $POD_NAME -n bookcars
```

### 4. Check Current Logs
```bash
POD_NAME=$(kubectl get pods -n bookcars -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl logs $POD_NAME -n bookcars --tail=100
```

### 5. Check Previous Logs (if pod crashed)
```bash
POD_NAME=$(kubectl get pods -n bookcars -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl logs $POD_NAME -n bookcars --previous --tail=100
```

### 6. Check Container Status
```bash
POD_NAME=$(kubectl get pods -n bookcars -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl get pod $POD_NAME -n bookcars -o jsonpath='{.status.containerStatuses[0]}' | jq '.'
```

### 7. Check Events
```bash
kubectl get events -n bookcars --sort-by='.lastTimestamp' | grep backend | tail -20
```

### 8. Test Health Endpoint
```bash
POD_NAME=$(kubectl get pods -n bookcars -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec $POD_NAME -n bookcars -- wget -q -O- http://localhost:3000/api/health
```

## Common Issues and Solutions

### Issue 1: Health Check Failures
**Symptoms**: Pod restarts, readiness/liveness probe failures
**Check**:
```bash
kubectl describe pod <pod-name> -n bookcars | grep -A 10 "Liveness\|Readiness"
```
**Solution**: 
- Verify `/api/health` endpoint exists (we added it)
- Increase `initialDelaySeconds` if app takes time to start
- Increase `timeoutSeconds` if health check is slow

### Issue 2: Application Crashes
**Symptoms**: Pod restarts, exit code in logs
**Check**:
```bash
kubectl logs <pod-name> -n bookcars --previous
```
**Common causes**:
- Database connection failures (check `BC_DB_URI`)
- Missing environment variables
- Application errors

### Issue 3: Out of Memory (OOMKilled)
**Symptoms**: Pod status shows `OOMKilled`
**Check**:
```bash
kubectl describe pod <pod-name> -n bookcars | grep -i "oom\|memory"
```
**Solution**: Increase memory limits in deployment.yaml

### Issue 4: Database Connection Issues
**Symptoms**: Logs show MongoDB connection errors
**Check**:
```bash
kubectl logs <pod-name> -n bookcars | grep -i "mongo\|database\|connection"
```
**Solution**: 
- Verify `BC_DB_URI` in secrets is correct
- Check MongoDB service is accessible: `kubectl get svc mongodb -n mongodb`
- Test connection: `kubectl exec <pod-name> -n bookcars -- wget -q -O- http://mongodb.mongodb.svc.cluster.local:27017`

### Issue 5: Missing Environment Variables
**Symptoms**: Application fails to start, logs show undefined variables
**Check**:
```bash
kubectl get secret bookcars-secrets -n bookcars -o yaml
kubectl get configmap bookcars-config -n bookcars -o yaml
```
**Solution**: Ensure all required secrets are set in GitHub Secrets

## Automated Debug Script

Run the automated debug script:
```bash
bash k8s/debug-backend.sh
```

This will gather all the information above automatically.

## Fixing Common Problems

### If Health Check is Failing:
1. Check if `/api/health` endpoint is accessible
2. Increase probe timeouts
3. Verify the app is listening on port 3000

### If App is Crashing:
1. Check logs for error messages
2. Verify all required environment variables are set
3. Check database connectivity
4. Verify image was built correctly

### If Pod Won't Start:
1. Check image pull errors (GHCR authentication)
2. Check resource limits
3. Check volume mounts (PVC exists)
4. Check security contexts


