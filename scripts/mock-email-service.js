#!/usr/bin/env node
/* eslint-disable no-console */
const http = require("http");

const PORT = Number(process.env.MOCK_EMAIL_PORT || 8025);

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/send") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      console.log(`[mock-email] ${new Date().toISOString()} ${body}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ accepted: true }));
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "NOT_FOUND" }));
});

server.listen(PORT, () => {
  console.log(`Mock email service listening on http://localhost:${PORT}`);
});
