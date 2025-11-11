import express from "express";
import { createBot } from "mineflayer";

const MC_HOST = "nexgeneration.sdlf.fun";
const MC_PORT = 49376;
const MC_USERNAME = "PruebaNex";

// --- Servidor web keep-alive ---
const app = express();
app.get("/", (_req, res) => res.send("✅ Bot NexGeneration activo"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[WEB] Keep-alive iniciado en puerto ${PORT}`));

// --- Función para iniciar el bot ---
let bot;
function startBot() {
  console.log("[BOT] Iniciando conexión al servidor...");

  bot = createBot({
    host: MC_HOST,
    port: MC_PORT,
    username: MC_USERNAME,
    version: false // autodetecta la versión del servidor
  });

  bot.once("spawn", () => {
    console.log("[BOT] Conectado y spawneado en NexGeneration ✔");

    // Movimiento aleatorio anti-AFK
    const antiAfk = () => {
      try {
        bot.setControlState("jump", true);
        setTimeout(() => bot.setControlState("jump", false), 200);

        const yaw = Math.random() * Math.PI * 2;
        bot.look(yaw, 0, true);

        bot.setControlState("forward", true);
        setTimeout(() => bot.setControlState("forward", false), 400);
      } catch (e) {
        console.log("[BOT] Error anti-AFK:", e.message);
      }
    };
    setInterval(antiAfk, 45000); // cada 45 segundos

    // Auto-respawn
    bot.on("death", () => {
      console.log("[BOT] Muerto, intentando respawn...");
      setTimeout(() => bot.respawn(), 2000);
    });

    // Mensaje de prueba cada 15 min
    setInterval(() => {
      try { bot.chat("🤖 Bot activo en NexGeneration ✅"); } catch {}
    }, 15 * 60 * 1000);
  });

  bot.on("kicked", (reason, loggedIn) =>
    console.log("[BOT] Kickeado:", reason?.toString?.() || reason, "loggedIn:", loggedIn)
  );

  bot.on("end", () => {
    console.log("[BOT] Desconectado. Reintentando en 15s...");
    setTimeout(startBot, 15000);
  });

  bot.on("error", (err) => console.log("[BOT] Error:", err.message));
}

startBot();
