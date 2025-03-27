import express from "express";
import cors from "cors";
import morgan from "morgan";
import { Webhook } from "svix";
import bodyParser from "body-parser";

import * as middleware from "./utils/middleware.js";
import helloRoute from "./routes/helloRouter.js";


const app = express();
//const webhookSecret = process.env.WEBHOOK_SECRET; // la vas a configurar más adelante en Railway
console.log("🔐 SVIX_SECRET leída desde process.env:", process.env.SVIX_SECRET);
const svixSecret = process.env.SVIX_SECRET || ""; // Idealmente en tus variables de entorno
console.log("🔐 SVIX_SECRET leído:", svixSecret);
console.log("🔐 SVIX_SECRET leído2:", `"${process.env.SVIX_SECRET}"`);



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

app.post("/webhook", async (req, res) => {
  try {
    const payload = JSON.stringify(req.body);
    const headers = req.headers;

    console.log("📩 Headers recibidos:", headers);
    console.log("📦 Payload recibido:", payload);

    const wh = new Webhook(process.env.SVIX_SECRET || "");
    const evt = wh.verify(payload, headers);

    console.log("✅ Webhook verificado:", evt);

    if (evt.type === "payment_intent.succeeded") {
      console.log("💰 Pago exitoso:", evt.data);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("❌ Error verificando webhook:", err.message);
    res.status(400).json({ error: "Webhook no verificado" });
  }
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
