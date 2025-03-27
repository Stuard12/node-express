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
app.post("/webhook", (req, res) => {
  console.log("📩 Webhook recibido desde Recurrente:");
  console.log(req.body);

  // Aquí podrías validar firma si Recurrente la envía

  res.status(200).json({ status: "ok" }); // Confirmación de recepción
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
