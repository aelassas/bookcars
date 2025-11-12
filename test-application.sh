#!/bin/bash

echo "=== BookCars Application Test ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test MongoDB
echo "1. Testing MongoDB..."
if systemctl is-active --quiet mongod 2>/dev/null || sudo systemctl is-active --quiet mongod 2>/dev/null; then
    echo -e "${GREEN}✅ MongoDB is running${NC}"
else
    echo -e "${RED}❌ MongoDB is not running${NC}"
    echo "   Start with: sudo systemctl start mongod"
fi

# Test Backend
echo ""
echo "2. Testing Backend..."
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null | grep -q "200\|404\|401"; then
    echo -e "${GREEN}✅ Backend is responding on port 3000${NC}"
    BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health 2>/dev/null)
    echo "   API health check: $BACKEND_STATUS"
else
    echo -e "${RED}❌ Backend is not responding on port 3000${NC}"
    echo "   Start with: sudo systemctl start bookcars-backend"
fi

# Test Nginx
echo ""
echo "3. Testing Nginx..."
if systemctl is-active --quiet nginx 2>/dev/null || sudo systemctl is-active --quiet nginx 2>/dev/null; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
else
    echo -e "${RED}❌ Nginx is not running${NC}"
    echo "   Start with: sudo systemctl start nginx"
fi

# Test Static Files
echo ""
echo "4. Testing Static Files..."
if [ -f /var/www/bookcars/frontend/index.html ]; then
    echo -e "${GREEN}✅ Frontend files exist${NC}"
else
    echo -e "${RED}❌ Frontend files missing${NC}"
fi

if [ -f /var/www/bookcars/admin/index.html ]; then
    echo -e "${GREEN}✅ Admin files exist${NC}"
else
    echo -e "${RED}❌ Admin files missing${NC}"
fi

# Test HTTP Endpoints
echo ""
echo "5. Testing HTTP Endpoints..."

FRONTEND_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/ 2>/dev/null)
ADMIN_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/admin/ 2>/dev/null)
API_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/api/health 2>/dev/null)

echo "   Frontend (HTTP): $FRONTEND_HTTP"
echo "   Admin (HTTP): $ADMIN_HTTP"
echo "   API (HTTP): $API_HTTP"

# Test HTTPS Endpoints
echo ""
echo "6. Testing HTTPS Endpoints..."

FRONTEND_HTTPS=$(curl -k -s -o /dev/null -w "%{http_code}" https://127.0.0.1/ 2>/dev/null)
ADMIN_HTTPS=$(curl -k -s -o /dev/null -w "%{http_code}" https://127.0.0.1/admin/ 2>/dev/null)
API_HTTPS=$(curl -k -s -o /dev/null -w "%{http_code}" https://127.0.0.1/api/health 2>/dev/null)

echo "   Frontend (HTTPS): $FRONTEND_HTTPS"
echo "   Admin (HTTPS): $ADMIN_HTTPS"
echo "   API (HTTPS): $API_HTTPS"

# Summary
echo ""
echo "=== Summary ==="
echo ""

if [ "$FRONTEND_HTTPS" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
elif [ "$FRONTEND_HTTPS" = "301" ] || [ "$FRONTEND_HTTP" = "301" ]; then
    echo -e "${YELLOW}⚠️  Frontend redirecting (check HTTPS config)${NC}"
else
    echo -e "${RED}❌ Frontend not accessible (Status: $FRONTEND_HTTPS)${NC}"
fi

if [ "$ADMIN_HTTPS" = "200" ]; then
    echo -e "${GREEN}✅ Admin panel is accessible${NC}"
elif [ "$ADMIN_HTTPS" = "301" ] || [ "$ADMIN_HTTP" = "301" ]; then
    echo -e "${YELLOW}⚠️  Admin redirecting (check HTTPS config)${NC}"
else
    echo -e "${RED}❌ Admin panel not accessible (Status: $ADMIN_HTTPS)${NC}"
fi

if [ "$API_HTTPS" = "200" ] || [ "$API_HTTPS" = "404" ]; then
    echo -e "${GREEN}✅ API is responding${NC}"
else
    echo -e "${RED}❌ API not responding (Status: $API_HTTPS)${NC}"
fi

echo ""
echo "=== Next Steps ==="
echo ""
echo "If you see 502 errors, try:"
echo "  1. sudo nginx -t  # Test Nginx config"
echo "  2. sudo systemctl reload nginx  # Reload Nginx"
echo "  3. sudo tail -f /var/log/nginx/error.log  # Check errors"
echo ""
echo "If backend is not running:"
echo "  1. sudo systemctl start bookcars-backend"
echo "  2. sudo journalctl -u bookcars-backend -f  # Check logs"
echo ""
echo "If MongoDB is not running:"
echo "  1. sudo systemctl start mongod"
echo "  2. sudo systemctl status mongod"

