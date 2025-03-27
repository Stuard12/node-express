import express from "express";
import cors from "cors";
import morgan from "morgan";
import { Webhook } from "svix";
import bodyParser from "body-parser";

import * as middleware from "./utils/middleware.js";
import helloRoute from "./routes/helloRouter.js";


const app = express();
//const webhookSecret = process.env.WEBHOOK_SECRET; // la vas a configurar más adelante en Railway
const svixSecret = process.env.SVIX_SECRET || ""; // Idealmente en tus variables de entorno



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
app.use("/webhook", bodyParser.raw({ type: "application/json" }));

app.post("/webhook", bodyParser.raw({ type: "*/*" }), (req, res) => {
  const payload = req.body;
  const headers = req.headers;

  const wh = new Webhook(svixSecret);

  let evt;

  try {
    evt = wh.verify(payload, headers);
  } catch (err) {
    console.error("❌ Firma de Webhook inválida:", err.message);
    return res.status(400).json({ error: "Firma no válida" });
  }

  const { type, data } = evt;

  console.log("✅ Webhook recibido correctamente");
  console.log("🧾 Tipo de evento:", type);
  console.log("📦 Datos del evento:", data);

  // Puedes actuar aquí dependiendo del evento recibido
  // if (type === "payment.completed") { ... }

  return res.status(200).json({ message: "Evento procesado con éxito" });
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
