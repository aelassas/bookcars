# Phone and network access

## Phone on the same Wi-Fi

SafarRent is a responsive web app, so a phone can use it in a mobile browser. The standard development Compose setup intentionally binds to `127.0.0.1`; that keeps it private to the development computer.

For a trusted local demonstration, run this from PowerShell in the project directory:

```powershell
.\scripts\start-lan-demo.ps1
```

The script detects the computer's private IPv4 address, binds only the web/API ports to the LAN, keeps MongoDB loopback-only, and prints the customer and admin URLs. Open the customer URL on a phone connected to the same Wi-Fi. If Windows Firewall prompts, allow the ports only on a trusted Private network. If the phone still cannot connect, check that the Wi-Fi does not enable client/AP isolation and that both devices are on the same subnet.

The apps derive their API hostname from the page URL in this mode, so sign-in cookies work with both the existing `localhost` browser URLs and the phone's private IP URL.

To return to loopback-only access, stop and restart the dev services without the LAN environment variables:

```powershell
Remove-Item Env:SAFARRENT_LAN_HOST -ErrorAction SilentlyContinue
Remove-Item Env:SAFARRENT_BIND_ADDRESS -ErrorAction SilentlyContinue
docker compose -f docker-compose.dev.yml up -d
```

## Public internet access

The LAN script is **not** a public deployment. It uses plain HTTP, development servers, demo suppliers, and local storage. Do not port-forward these ports or expose them to public networks.

Internet access from unrelated networks requires a production deployment with a public domain, HTTPS reverse proxy, managed backend/database/object storage, production secrets, rate limits, monitoring/backups, and configured OAuth redirect origins. The customer API host, CORS allowlist, cookie domain, email verification, and identity-provider configuration must use that domain. A local machine and this repository cannot provide an always-reachable public endpoint without an internet-facing host and network configuration.

Google sign-in is shown only when a real Google OAuth client ID is configured. The local `XXXXXXXXXX` placeholder caused the screenshot's `invalid_client` error; email/password registration remains available without Google OAuth.
