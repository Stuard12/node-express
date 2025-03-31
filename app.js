import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import { Webhook } from "svix";
import bodyParser from "body-parser";
import axios from "axios";
import * as middleware from "./utils/middleware.js";
import helloRoute from "./routes/helloRouter.js";

const app = express();

console.log("PUBLIC KEY:", process.env.RECURRENTE_PUBLIC_KEY);
console.log("SECRET KEY:", process.env.RECURRENTE_SECRET_KEY);
console.log("SVIX SECRET:", process.env.SVIX_SECRET);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

// ✅ ENDPOINT DE CREACIÓN DEL CHECKOUT (Shopify lo usará)
app.post("/crear-checkout", async (req, res) => {
    try {
        console.log("✅ Recibido POST en /crear-checkout");

        const { name, amount_in_cents, currency, image_url, quantity } = req.body;

        if (!name || !amount_in_cents || !currency) {
            return res.status(400).json({ error: "Faltan datos obligatorios." });
        }

        const data = {
            items: [
                {
                    name,
                    amount_in_cents,
                    currency,
                    image_url: image_url || "",
                    quantity: quantity || 1
                }
            ],
            success_url: "https://node-express-production-0263.up.railway.app/success",
            cancel_url: "https://node-express-production-0263.up.railway.app/cancel"
        };

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

        return res.status(200).json({
            checkout_url: response.data.checkout_url,
            id: response.data.id
        });

    } catch (error) {
        console.error("❌ Error creando checkout:", error.response?.data || error.message);
        return res.status(500).json({ error: "Error creando checkout" });
    }
});

// ✅ Redireccion exitoso
app.get("/success", (req, res) => {
    res.send(`
        <h1>✅ Pago exitoso</h1>
        <p>Tu pago fue completado correctamente.</p>
        <a href="https://TU_TIENDA.myshopify.com">Volver a la tienda</a>
    `);
});

// ✅ Redireccion cancelado
app.get("/cancel", (req, res) => {
    res.send(`
        <h1>❌ Pago cancelado</h1>
        <p>El cliente canceló el pago.</p>
        <a href="https://TU_TIENDA.myshopify.com">Volver a la tienda</a>
    `);
});


// ✅ ENDPOINT DEL WEBHOOK DE RECURRENTE (con validación)
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

// ✅ Rutas auxiliares
app.use("/hello", helloRoute);
app.get("/", (req, res) => {
    res.status(200).send({ status: "ok" });
});

// ✅ Manejo de errores
app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

export default app;
