#!/bin/sh
set -e

# Runtime environment variable handler for Vite frontend
# Note: Vite apps bake environment variables at build time.
# Runtime env vars are available in the container but won't affect the built app
# unless you implement a runtime config mechanism in your app code.
# This script ensures env vars are available and logs them for debugging.

echo "Starting frontend container..."

# Log environment variables (without sensitive values)
echo "Environment variables available in container:"
env | grep "^VITE_BC_" | sed 's/=.*/=***/' | sort || true

# Note: For true runtime support, you would need to:
# 1. Implement a window.__ENV__ injection mechanism in your app
# 2. Or use a server-side rendering approach
# 3. Or rebuild the image when env vars change

# Execute the main command (nginx)
exec "$@"
