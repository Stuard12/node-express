console.log("🔥 ESTE ES EL index.js QUE ESTÁ CORRIENDO");

import http from "http";
import { config } from "dotenv";
import app from "./app.js";
import * as logger from "./utils/logger.js";

if (process.env.NODE_ENV !== "production") {
	config();
}
const server = http.createServer(app);

const PORT = process.env.PORT || 3003;

server.listen(PORT, () => {
	logger.info(`Server listening at http://localhost:${PORT}`);
	logger.info(`Access the root route at http://localhost:${PORT}/hello`);
});
console.log("🚀 Servidor reiniciado cuarto intento  💥 Ahora sí deberías ver esto en los logs");

import express from "express";

// Asegurate de que tu app esté usando express.json()
app.use(express.json());

app.post("/pagar", (req, res) => {
  console.log("📥 Se recibió un POST en /pagar");
  console.log("💳 Datos recibidos:", req.body);

  res.status(200).json({
    mensaje: "✅ Pago recibido correctamente",
    datos: req.body
  });
});
