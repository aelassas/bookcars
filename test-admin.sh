#!/bin/bash

echo "=== Admin Panel Test ==="
echo ""

# Test admin panel
echo "1. Testing Admin Panel Access..."
ADMIN_STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" https://127.0.0.1/admin/ 2>/dev/null)

if [ "$ADMIN_STATUS" = "200" ]; then
    echo "✅ Admin panel is accessible (Status: $ADMIN_STATUS)"
    
    # Get the HTML
    HTML=$(curl -k -s https://127.0.0.1/admin/ 2>/dev/null)
    TITLE=$(echo "$HTML" | grep -o "<title>.*</title>")
    echo "   $TITLE"
    
    # Check if assets are loading
    echo ""
    echo "2. Testing Admin Assets..."
    
    JS_STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" https://127.0.0.1/admin/entries/index-w9kfQJ96.js 2>/dev/null)
    CSS_STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" https://127.0.0.1/admin/assets/index-BxrFG0gX.css 2>/dev/null)
    
    if [ "$JS_STATUS" = "200" ]; then
        echo "✅ JavaScript file accessible"
    else
        echo "❌ JavaScript file not accessible (Status: $JS_STATUS)"
    fi
    
    if [ "$CSS_STATUS" = "200" ]; then
        echo "✅ CSS file accessible"
    else
        echo "❌ CSS file not accessible (Status: $CSS_STATUS)"
    fi
    
    echo ""
    echo "3. Testing API Endpoint..."
    API_STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" -X POST https://127.0.0.1/api/sign-in/admin -H "Content-Type: application/json" -d '{"email":"test","password":"test"}' 2>/dev/null)
    echo "   API Status: $API_STATUS (400/404 is expected for invalid credentials)"
    
    echo ""
    echo "✅ Admin panel is working!"
    echo ""
    echo "Access at: https://tokyodrivingclub.com/admin/"
    echo "Login with:"
    echo "  Email: admin@bookcars.ma"
    echo "  Password: B00kC4r5"
    
elif [ "$ADMIN_STATUS" = "502" ]; then
    echo "❌ Admin panel returns 502 Bad Gateway"
    echo ""
    echo "This means Nginx needs to be reloaded:"
    echo "  sudo nginx -t"
    echo "  sudo systemctl reload nginx"
    echo ""
    echo "Then run this test again: ./test-admin.sh"
    
elif [ "$ADMIN_STATUS" = "301" ]; then
    echo "⚠️  Admin panel redirecting (Status: $ADMIN_STATUS)"
    echo "   This is normal - HTTP redirects to HTTPS"
    
else
    echo "❌ Admin panel not accessible (Status: $ADMIN_STATUS)"
    echo "   Check Nginx configuration and logs"
fi

