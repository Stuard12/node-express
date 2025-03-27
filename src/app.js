import express from "express";
import cors from "cors";
import morgan from "morgan";

import * as middleware from "./utils/middleware.js";
import helloRoute from "./routes/helloRouter.js";

const app = express();

// Middleware base (colocar siempre antes que las rutas)
app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

// ✅ TU ENDPOINT AQUÍ
app.post("/pagar", (req, res) => {
  console.log("📥 Se recibió un POST en /pagar");
  console.log("💳 Datos recibidos:", req.body);

  res.status(200).json({
    mensaje: "✅ Pago recibido correctamente",
    datos: req.body
  });
});

// ✅ WEBHOOK de RECURRENTE
import { Webhook } from "svix";
import bodyParser from "body-parser";

const webhookSecret = process.env.WEBHOOK_SECRET; // la vas a configurar más adelante en Railway

app.use("/webhook", bodyParser.raw({ type: "application/json" }));

app.post("/webhook", async (req, res) => {
  const payload = req.body;
  const headers = req.headers;

  const wh = new Webhook(webhookSecret);

  let evt;

  try {
    evt = wh.verify(payload, headers);
  } catch (err) {
    console.error("❌ Webhook verification failed.", err.message);
    return res.status(400).json({ error: "Invalid webhook" });
  }

  const eventType = evt.type;
  console.log("✅ Evento recibido:", eventType);
  console.log("🧾 Contenido:", evt.data);

  res.status(200).json({ received: true });
});

// Otras rutas
app.get("/", (req, res) => {
  res.status(200).send({ status: "ok" });
});

app.use("/hello", helloRoute);

// Manejo de errores
app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

export default app;
