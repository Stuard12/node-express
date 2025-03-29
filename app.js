import express from "express";
import cors from "cors";
import morgan from "morgan";
import { Webhook } from "svix";
import bodyParser from "body-parser";

import * as middleware from "./utils/middleware.js";
import helloRoute from "./routes/helloRouter.js";
import axios from "axios";

const app = express();
const publicKey = process.env.RECURRENTE_PUBLIC_KEY;
const secretKey = process.env.RECURRENTE_SECRET_KEY;
const svixSecret = process.env.SVIX_SECRET;

console.log("PUBLIC KEY:", publicKey);
console.log("SECRET KEY:", secretKey);
console.log("SVIX SECRET:", svixSecret);

// Middleware base
app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));


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
// ✅ CREAR CHECKOUT de RECURRENTE
app.post("/crear-checkout", async (req, res) => {
  try {
    console.log("✅ Recibido POST en /crear-checkout");

    const { name, amount_in_cents, currency, image_url, quantity } = req.body;

    // Validación básica
    if (!name || !amount_in_cents || !currency) {
      return res.status(400).json({ error: "Faltan datos obligatorios." });
    }

    // Datos para Recurrente
    const data = {
      items: [
        {
          name,
          amount_in_cents,
          currency,
          image_url: image_url || "", // opcional
          quantity: quantity || 1     // default 1
        }
      ],
      success_url: "https://www.google.com",
      cancel_url: "https://www.amazon.com"
    };

    // Llamada a Recurrente
    const response = await axios.post(
      "https://app.recurrente.com/api/checkouts/",
      data,
      {
        headers: {
          "X-PUBLIC-KEY": process.env.RECURRENTE_PUBLIC_KEY,
          "X-SECRET-KEY": process.env.RECURRENTE_SECRET_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Checkout creado:", response.data);

    // Responder al front
    return res.status(200).json({
      checkout_url: response.data.checkout_url,
      id: response.data.id
    });

  } catch (error) {
    console.error("❌ Error creando checkout:", error.response?.data || error.message);
    return res.status(500).json({ error: "Error creando checkout" });
  }
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
