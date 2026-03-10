const express = require("express");
const cors = require("cors");
const { requestLogger } = require("./config/logger");
const routes = require("./routes");
const path = require("path");

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      const allow = !origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      cb(null, allow ? origin || true : false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api", requestLogger, routes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
});

module.exports = app;
