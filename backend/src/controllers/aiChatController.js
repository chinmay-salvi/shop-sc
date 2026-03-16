const Groq = require("groq-sdk");
const { getAllListings } = require("../models/listing");
const logger = require("../config/logger");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function chat(req, res) {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  try {
    const listings = await getAllListings();
    const listingsSummary = listings.length === 0
      ? "There are currently no listings on the marketplace."
      : listings.map((l, i) =>
          `${i + 1}. Title: ${l.title} | Price: $${l.price} | Category: ${l.category || "General"} | Description: ${l.description || "No description"} | Link: [View Listing](http://localhost:3000/marketplace/${l.id}) | Image: ${l.image_url ? `![image](http://localhost:4000${l.image_url})` : ""}`

        ).join("\n");

    const SYSTEM_PROMPT = `You are Tommy Trojan, a helpful assistant for shop-sc, a privacy-preserving USC student marketplace.
You help USC students buy and sell items on campus.
IMPORTANT: Only answer based on the real data provided below. Do not make up listings or prices.
If a user asks about listings, only refer to the ones listed below.
If there are no listings, say so honestly.
Current listings on the marketplace:
${listingsSummary}
Keep responses concise and friendly. Never ask for or mention personal information.
IMPORTANT: Always format listing links as markdown like this: [View Listing](url). Never show raw URLs.
IMPORTANT: Always display listing images using markdown like this: ![image](url). Always include the image when showing listings.`;
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      ],
    });

    const reply = response.choices[0]?.message?.content || "";
    logger.logBasic("ai.chat success");
    return res.json({ reply });
  } catch (err) {
    logger.logBasic("ai.chat error", { error: err.message });
    return res.status(500).json({ error: "AI service unavailable" });
  }
}

module.exports = { chat };