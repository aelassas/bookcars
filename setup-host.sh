#!/bin/bash
set -e

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Ensure Node.js 20 is being used
nvm use 20 || nvm install 20 && nvm use 20

echo "=== Setting up BookCars to run on host ==="
echo "Using Node.js version: $(node --version)"
echo ""

# Create directories
echo "Creating directories..."
sudo mkdir -p /var/www/cdn/bookcars/{users,temp/users,cars,temp/cars,locations,temp/locations,contracts,temp/contracts,licenses,temp/licenses}
sudo mkdir -p /var/www/bookcars/{frontend,admin}
sudo chown -R $USER:$USER /var/www/cdn/bookcars
sudo chown -R $USER:$USER /var/www/bookcars

# Create backend .env file
echo "Creating backend .env file..."
cat > /home/ubuntu/bookcars/backend/.env << 'EOF'
# BookCars Backend Environment Configuration for Host

# Server Configuration
BC_PORT=3000
BC_HTTPS=false

# Database Configuration (MongoDB is running on host on port 27017)
BC_DB_URI=mongodb://admin:admin@localhost:27017/bookcars?authSource=admin&appName=bookcars
BC_DB_SSL=false
BC_DB_DEBUG=false

# Security
BC_JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
BC_COOKIE_SECRET=your-super-secret-cookie-key-change-this-in-production-min-32-chars
BC_AUTH_COOKIE_DOMAIN=tokyodrivingclub.com

# Website Configuration
BC_WEBSITE_NAME=BookCars
BC_DEFAULT_LANGUAGE=en
BC_MINIMUM_AGE=21
BC_TIMEZONE=UTC

# Host Configuration
BC_ADMIN_HOST=https://tokyodrivingclub.com/admin
BC_FRONTEND_HOST=https://tokyodrivingclub.com

# CDN Paths (on host filesystem)
BC_CDN_ROOT=/var/www/cdn/bookcars
BC_CDN_USERS=/var/www/cdn/bookcars/users
BC_CDN_TEMP_USERS=/var/www/cdn/bookcars/temp/users
BC_CDN_CARS=/var/www/cdn/bookcars/cars
BC_CDN_TEMP_CARS=/var/www/cdn/bookcars/temp/cars
BC_CDN_LOCATIONS=/var/www/cdn/bookcars/locations
BC_CDN_TEMP_LOCATIONS=/var/www/cdn/bookcars/temp/locations
BC_CDN_CONTRACTS=/var/www/cdn/bookcars/contracts
BC_CDN_TEMP_CONTRACTS=/var/www/cdn/bookcars/temp/contracts
BC_CDN_LICENSES=/var/www/cdn/bookcars/licenses
BC_CDN_TEMP_LICENSES=/var/www/cdn/bookcars/temp/licenses

# SMTP Configuration (Email)
BC_SMTP_HOST=smtp-relay.brevo.com
BC_SMTP_PORT=587
BC_SMTP_USER=prasanta.sahoo@emoment.in
BC_SMTP_PASS=qDPMBSLmdYIvxgJh
BC_SMTP_FROM=prasanta.sahoo@emoment.in

# JWT Configuration
BC_JWT_EXPIRE_AT=86400
BC_TOKEN_EXPIRE_AT=86400

# Payment Gateways
BC_STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
BC_STRIPE_SESSION_EXPIRE_AT=82800

# PayPal
BC_PAYPAL_SANDBOX=true
BC_PAYPAL_CLIENT_ID=your_paypal_client_id
BC_PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Admin Email
BC_ADMIN_EMAIL=admin@bookcars.ma

# IP Info
BC_IPINFO_DEFAULT_COUNTRY=US

# Sentry Error Tracking
BC_ENABLE_SENTRY=false
BC_SENTRY_TRACES_SAMPLE_RATE=1.0

# CI/CD
BC_CI=false
BC_BATCH_SIZE=1000
EOF

echo "✅ Backend .env file created"

# Install backend dependencies
echo ""
echo "Installing backend dependencies..."
cd /home/ubuntu/bookcars/backend
npm install

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
cd /home/ubuntu/bookcars/frontend
npm install

# Install admin dependencies
echo ""
echo "Installing admin dependencies..."
cd /home/ubuntu/bookcars/admin
npm install

# Create frontend .env file for build
echo ""
echo "Creating frontend .env file for build..."
cat > /home/ubuntu/bookcars/frontend/.env << 'ENVEOF'
# BookCars Frontend Environment Configuration for Host

# API Configuration (empty = relative path, will use Nginx proxy)
VITE_BC_API_HOST=

# Website Configuration
VITE_BC_WEBSITE_NAME=BookCars
VITE_BC_DEFAULT_LANGUAGE=en
VITE_BC_BASE_CURRENCY=USD

# Currency
VITE_BC_CURRENCY=\$

# Pagination
VITE_BC_PAGE_SIZE=30
VITE_BC_CARS_PAGE_SIZE=15
VITE_BC_BOOKINGS_PAGE_SIZE=20
VITE_BC_BOOKINGS_MOBILE_PAGE_SIZE=10
VITE_BC_PAGINATION_MODE=CLASSIC

# Images
VITE_BC_SUPPLIER_IMAGE_WIDTH=60
VITE_BC_SUPPLIER_IMAGE_HEIGHT=30
VITE_BC_CAR_IMAGE_WIDTH=300
VITE_BC_CAR_IMAGE_HEIGHT=200

# Minimum Age
VITE_BC_MINIMUM_AGE=21

# Features
VITE_BC_RECAPTCHA_ENABLED=false
VITE_BC_SET_LANGUAGE_FROM_IP=false
VITE_BC_GOOGLE_ANALYTICS_ENABLED=false
VITE_BC_HIDE_SUPPLIERS=false

# Payment Gateways
VITE_BC_PAYMENT_GATEWAY=STRIPE
VITE_BC_STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXX
VITE_BC_PAYPAL_CLIENT_ID=sb
VITE_BC_PAYPAL_DEBUG=true

# Map
VITE_BC_MAP_LATITUDE=34.0268755
VITE_BC_MAP_LONGITUDE=1.6528399999999976
VITE_BC_MAP_ZOOM=5
ENVEOF

# Build frontend
echo ""
echo "Building frontend..."
cd /home/ubuntu/bookcars/frontend
npm run build
sudo cp -r build/* /var/www/bookcars/frontend/

# Create admin .env file for build
echo ""
echo "Creating admin .env file for build..."
cat > /home/ubuntu/bookcars/admin/.env << 'ENVEOF'
# BookCars Admin Environment Configuration for Host

# API Configuration (empty = relative path, will use Nginx proxy)
VITE_BC_API_HOST=

# Website Configuration
VITE_BC_WEBSITE_NAME=BookCars
VITE_BC_DEFAULT_LANGUAGE=en

# Currency
VITE_BC_CURRENCY=\$

# Pagination
VITE_BC_PAGE_SIZE=30
VITE_BC_CARS_PAGE_SIZE=15
VITE_BC_BOOKINGS_PAGE_SIZE=20
VITE_BC_BOOKINGS_MOBILE_PAGE_SIZE=10
VITE_BC_PAGINATION_MODE=CLASSIC

# Images
VITE_BC_SUPPLIER_IMAGE_WIDTH=60
VITE_BC_SUPPLIER_IMAGE_HEIGHT=30
VITE_BC_CAR_IMAGE_WIDTH=300
VITE_BC_CAR_IMAGE_HEIGHT=200

# Minimum Age
VITE_BC_MINIMUM_AGE=21

# Features
VITE_BC_RECAPTCHA_ENABLED=false
ENVEOF

# Build admin
echo ""
echo "Building admin panel..."
cd /home/ubuntu/bookcars/admin
npm run build
sudo cp -r build/* /var/www/bookcars/admin/
sudo chown -R www-data:www-data /var/www/bookcars

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run backend setup: cd /home/ubuntu/bookcars/backend && npm run setup"
echo "2. Start backend: cd /home/ubuntu/bookcars/backend && npm start"
echo "3. Update Nginx configuration (see setup-nginx.sh)"

