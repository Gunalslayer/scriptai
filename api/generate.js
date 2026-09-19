/* ============================================================
   API CONFIG — customize this file later
   The key is read from the ANTHROPIC_API_KEY environment
   variable (set in Vercel). It never appears in the page.
   ============================================================ */
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1000;

const SYSTEM_PROMPT = `You are a short-form video strategist for small businesses.
Given a business name, product/service details and location, do two things:
1. Work out the single best target audience for this business in that location.
2. Write ONE Instagram Reel script that runs 40 seconds when spoken aloud.

Script rules:
- Total spoken length: about 90 words.
- "hook": about 12 words, spoken in the first 5 seconds. It must stop the scroll.
- "content": about 65 words, the middle 28 seconds. Show the value, be specific to the product and the location.
- "cta": about 15 words, the last 7 seconds. One clear action.
- Write in simple, natural spoken language. Use the same language as the user's input.

Return ONLY valid JSON, no markdown, no extra text, in exactly this shape:
{"audience":{"summary":"2 sentences: who they are and what they want","tags":["3 to 5 short traits"]},"script":{"hook":"","content":"","cta":""}}`;
/* ============================ end API CONFIG ============================ */

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const body = req.body || {};
  const name = String(body.name || "").trim().slice(0, 80);
  const details = String(body.details || "").trim().slice(0, 600);
  const location = String(body.location || "").trim().slice(0, 80);

  if (!name || !details || !location) {
    return res.status(400).json({ error: "name, details and location are required" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set" });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Business name: ${name}\nProduct/service details: ${details}\nLocation: ${location}`
        }]
      })
    });

    if (!r.ok) {
      console.error("Anthropic API error:", r.status, await r.text());
      return res.status(502).json({ error: "API request failed" });
    }

    const data = await r.json();
    const text = (data.content || [])
      .map(b => b.text || "")
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    return res.status(200).json(JSON.parse(text));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
};
