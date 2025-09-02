import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Bot, InlineKeyboard, webhookCallback } from "https://deno.land/x/grammy@v1.23.0/mod.ts";

const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
if (!BOT_TOKEN) throw new Error("BOT_TOKEN not set");

const bot = new Bot(BOT_TOKEN);

// Memory storage (better: DB)
const subscribers: Set<number> = new Set();
let lastSignal = "";

// -------- SIGNAL GENERATOR ----------
function generateSignal() {
  const pairs = [
    "🇺🇸 USD/JPY 🇯🇵","🇪🇺 EUR/USD 🇺🇸","🇬🇧 GBP/USD 🇺🇸",
    "🇦🇺 AUD/USD 🇺🇸","🇨🇭 USD/CHF 🇨🇭","🇨🇦 USD/CAD 🇨🇦",
    "🇳🇿 NZD/USD 🇺🇸","XAU/USD (Gold)","BTC/USDT","ETH/USDT"
  ];
  const pair = pairs[Math.floor(Math.random() * pairs.length)];
  const side = Math.random() > 0.5 ? "BUY" : "SELL";
  const now = new Date();

  return (
    `⚡ OTC Signal\n` +
    `📊 Market: ${pair}\n` +
    `📌 Type: ${side}\n` +
    `⏱️ Expiry: 1 Minute (Quotex)\n` +
    `🕒 Local: ${now.toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}\n`
  );
}

// -------- BOT COMMANDS ----------
bot.command("start", async (ctx) => {
  subscribers.add(ctx.chat.id);
  const kb = new InlineKeyboard().text("📡 Get Signal", "get-signal");
  await ctx.reply("✅ Subscribed to Auto Signals!", { reply_markup: kb });
});

bot.command("stop", async (ctx) => {
  subscribers.delete(ctx.chat.id);
  await ctx.reply("❌ You unsubscribed from Auto Signals.");
});

bot.command("help", (ctx) =>
  ctx.reply("/start → Subscribe\n/stop → Unsubscribe\n/help → Commands")
);

bot.callbackQuery("get-signal", async (ctx) => {
  lastSignal = generateSignal();
  await ctx.answerCallbackQuery();
  await ctx.reply(lastSignal);
});

// -------- AUTO BROADCAST ----------
async function autoBroadcast() {
  lastSignal = generateSignal();
  for (const chatId of subscribers) {
    try {
      await bot.api.sendMessage(chatId, lastSignal);
    } catch (err) {
      console.error("Send failed:", err);
    }
  }
}
setInterval(autoBroadcast, 2 * 60 * 1000);

// -------- WEB SERVER ----------
const handleUpdate = webhookCallback(bot, "std/http");

serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname === "/webhook") {
    return await handleUpdate(req);
  }

  if (url.pathname === "/signals.html") {
    return new Response(`<h1>📡 Last Signal</h1><pre>${lastSignal || "No signal yet"}</pre>`, {
      headers: { "content-type": "text/html" }
    });
  }

  if (url.pathname === "/users.html") {
    return new Response(`<h1>👥 Subscribers</h1><p>Total: ${subscribers.size}</p>`, {
      headers: { "content-type": "text/html" }
    });
  }

  return new Response("<h1>🚀 OTC Signal Bot Running</h1>", {
    headers: { "content-type": "text/html" }
  });
});