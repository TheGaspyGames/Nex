import express from "express";
import { createBot } from "mineflayer";

const MC_HOST = process.env.MC_HOST || "nexgneration.sdlf.fun";
const MC_PORT = Number(process.env.MC_PORT || 49376);
const MC_USERNAME = process.env.MC_USERNAME || "PruebaNex";
const MC_PASSWORD = process.env.MC_PASSWORD || "NexBotClave123";
const AUTH_RETRY_MS = 5000;

// --- Servidor web keep-alive ---
const app = express();
app.get("/", (_req, res) => res.send("✅ Bot NexGeneration activo"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[WEB] Keep-alive iniciado en puerto ${PORT}`));

// --- Función para iniciar el bot ---
let bot;
let authState = {};

function resetAuthState() {
  authState = {
    loggedIn: false,
    registrationAttempted: false,
    lastAuthCommand: 0
  };
}

function sendAuthCommand(command) {
  if (!bot) return;
  const now = Date.now();
  if (now - authState.lastAuthCommand < 3000) return;

  authState.lastAuthCommand = now;
  console.log(`[BOT] Enviando comando de autenticación: ${command}`);
  bot.chat(command);
}

function attemptLogin() {
  if (authState.loggedIn) return;
  sendAuthCommand(`/login ${MC_PASSWORD}`);
}

function attemptRegister() {
  if (authState.loggedIn || authState.registrationAttempted) return;

  authState.registrationAttempted = true;
  sendAuthCommand(`/register ${MC_PASSWORD} ${MC_PASSWORD}`);

  // Si el registro fue exitoso el servidor pedirá login, así que lo intentamos de nuevo tras un breve lapso
  setTimeout(() => {
    if (!authState.loggedIn) attemptLogin();
  }, AUTH_RETRY_MS);
}

function handleAuthMessage(text) {
  const lower = text.toLowerCase();

  const mentionsRegister =
    lower.includes("/register") ||
    lower.includes("registrate") ||
    lower.includes("regístrate") ||
    lower.includes("registrar") ||
    lower.includes("registro");

  const mentionsLogin =
    lower.includes("/login") ||
    lower.includes("login") ||
    lower.includes("loguea") ||
    lower.includes("loguear") ||
    lower.includes("inicia sesión") ||
    lower.includes("inicie sesión") ||
    lower.includes("inicia sesion") ||
    lower.includes("inicie sesion");

  const successLogin =
    lower.includes("sesión iniciada") ||
    lower.includes("sesion iniciada") ||
    lower.includes("logueado") ||
    lower.includes("loggeado") ||
    lower.includes("autenticado") ||
    lower.includes("login exitoso");

  const alreadyRegistered =
    lower.includes("ya estás registrado") ||
    lower.includes("ya estas registrado") ||
    lower.includes("ya está registrado") ||
    lower.includes("ya esta registrado");

  const wrongPassword =
    lower.includes("contraseña incorrecta") ||
    lower.includes("contrasena incorrecta") ||
    lower.includes("password incorrect") ||
    lower.includes("clave incorrecta");

  if (successLogin) {
    if (!authState.loggedIn) {
      authState.loggedIn = true;
      console.log("[BOT] Sesión iniciada correctamente ✔");
    }
    return;
  }

  if (wrongPassword) {
    console.log(`[BOT] Aviso del servidor: ${text}`);
    authState.loggedIn = false;
    authState.registrationAttempted = false;
    setTimeout(attemptLogin, AUTH_RETRY_MS);
    return;
  }

  if (alreadyRegistered) {
    authState.registrationAttempted = true;
    setTimeout(attemptLogin, 1000);
    return;
  }

  if (mentionsRegister && !authState.loggedIn) {
    attemptRegister();
  }

  if (mentionsLogin && !authState.loggedIn) {
    attemptLogin();
  }
}

function startBot() {
  console.log("[BOT] Iniciando conexión al servidor...");
  resetAuthState();

  bot = createBot({
    host: MC_HOST,
    port: MC_PORT,
    username: MC_USERNAME,
    version: false // autodetecta la versión del servidor
  });

  bot.once("spawn", () => {
    console.log("[BOT] Conectado y spawneado en NexGeneration ✔");

    // Intentos iniciales de autenticación
    setTimeout(attemptLogin, 2000);
    setTimeout(() => {
      if (!authState.loggedIn) attemptRegister();
    }, 6000);

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
      try {
        bot.chat("🤖 Bot activo en NexGeneration ✅");
      } catch {}
    }, 15 * 60 * 1000);
  });

  bot.on("message", (jsonMsg) => {
    try {
      const text = jsonMsg.toString();
      if (text) handleAuthMessage(text);
    } catch (err) {
      console.log("[BOT] Error procesando mensaje:", err.message);
    }
  });

  bot.on("kicked", (reason, loggedIn) => {
    console.log(
      "[BOT] Kickeado:",
      reason?.toString?.() || reason,
      "loggedIn:",
      loggedIn
    );
    resetAuthState();
  });

  bot.on("end", () => {
    console.log("[BOT] Desconectado. Reintentando en 15s...");
    setTimeout(startBot, 15000);
  });

  bot.on("error", (err) => console.log("[BOT] Error:", err.message));
}

startBot();
