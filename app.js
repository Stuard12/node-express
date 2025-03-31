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
app.use(express.json()); // Para Hoppscotch y otros clientes JSON
app.use(express.urlencoded({ extended: true })); // Para formularios HTML (como el de Shopify)
app.use(morgan("tiny"));

// ✅ ENDPOINT DE CREACIÓN DEL CHECKOUT (Shopify lo usará)
app.post("/crear-checkout", async (req, res) => {
    try {
        console.log("✅ Recibido POST en /crear-checkout");

        const { order_id, total_in_cents } = req.body;

        if (!order_id || !total_in_cents) {
            return res.status(400).json({ error: "Faltan datos obligatorios." });
        }

        // Preparar checkout
        const data = {
            items: [
                {
                    name: `Pedido Shopify #${order_id}`,
                    amount_in_cents: total_in_cents,
                    currency: "GTQ",
                    quantity: 1
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

        return res.redirect(response.data.checkout_url);

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

// Webhook seguro
app.post("/webhook", async (req, res) => {
    const payload = req.body;
    const headers = req.headers;

    console.log("📩 Headers recibidos:", headers);

    try {
        // Verificación de firma
        const wh = new Webhook(process.env.SVIX_SECRET);
        const evt = wh.verify(payload, headers);
        
        console.log("✅ Evento Verificado:", evt);

        // ⚡ Aquí procesas el evento según su tipo
        if (evt.type === "payment_intent.succeeded") {
            console.log("💰 Pago exitoso recibido:");
            console.log(evt.data);
            // Aquí luego puedes: 
            // - Notificar a Shopify
            // - Marcar pedido como pagado
            // - Guardar en base de datos
        } else {
            console.log("🔔 Otro evento recibido:", evt.type);
        }

        return res.status(200).json({ received: true });
    } catch (err) {
        console.error("❌ Error validando webhook:", err.message);
        return res.status(400).json({ error: "Webhook no verificado" });
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
