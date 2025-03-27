import express from "express";
import cors from "cors";
import morgan from "morgan";

import * as middleware from "./utils/middleware.js";
import helloRoute from "./routes/helloRouter.js";

const app = express();

// parse json request body
app.use(express.json());

app.post("/pagar", (req, res) => {
  console.log("📥 Se recibió un POST en /pagar");
  console.log("💳 Datos recibidos:", req.body);

  res.status(200).json({
    mensaje: "✅ Pago recibido correctamente",
    datos: req.body
  });
});

// enable cors
app.use(cors());

// request logger middleware
app.use(morgan("tiny"));

// healthcheck endpoint
app.get("/", (req, res) => {
  res.status(200).send({ status: "ok" });
});

app.use("/hello", helloRoute);

// custom middleware
app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

export default app;
