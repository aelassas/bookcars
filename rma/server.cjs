// Custom Next server: makes auth host-agnostic (injects X-Forwarded-Host so
// trustHost uses the real address the user typed) and exposes the client's
// LAN IP (X-Real-IP) so we can map a login to a device MAC on the office LAN.
const { createServer } = require("node:http");
const next = require("next");
const port = parseInt(process.env.PORT || "3000", 10);
const hostname = "0.0.0.0";
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();
app.prepare().then(() => {
  createServer((req, res) => {
    try {
      const ra = (req.socket && req.socket.remoteAddress) || "";
      const ip = ra.replace(/^::ffff:/, "");
      req.headers["x-real-ip"] = ip;
      req.headers["x-forwarded-for"] = ip;
      req.headers["x-forwarded-proto"] = "http";
      if (req.headers.host) req.headers["x-forwarded-host"] = req.headers.host;
    } catch {}
    handle(req, res);
  }).listen(port, hostname, () => {
    console.log("> custom server ready on " + hostname + ":" + port);
  });
});
