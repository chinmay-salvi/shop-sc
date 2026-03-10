require("dotenv").config();

const app = require("./app");
const { ensureSchema } = require("./config/database");
const { initGroup } = require("./services/groupManager");

const PORT = Number(process.env.PORT || 4000);

async function start() {
  await ensureSchema();
  await initGroup();

  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});
