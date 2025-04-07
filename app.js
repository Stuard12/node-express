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
import fs from "fs";

const app = express();

console.log("PUBLIC KEY:", process.env.RECURRENTE_PUBLIC_KEY);
console.log("SECRET KEY:", process.env.RECURRENTE_SECRET_KEY);
console.log("SVIX SECRET:", process.env.SVIX_SECRET);

// Middlewares
app.use(cors());
app.use(express.json()); // Para Hoppscotch y otros clientes JSON
app.use(express.urlencoded({ extended: true })); // Para formularios HTML (como el de Shopify)
app.use(morgan("tiny"));

// ✅ ENDPOINT DE CREACIÓN DEL CHECKOUT (Shopify lo usará) ------------------------------------------------------
app.post("/crear-checkout", async (req, res) => {
    try {
        console.log("✅ Recibido POST en /crear-checkout");

        const { order_id, total_in_cents } = req.body;

        if (!order_id || !total_in_cents) {
            console.warn("⚠️ Faltan datos en la petición:", req.body);
            return res.status(400).json({ error: "Faltan datos obligatorios." });
        }

        const totalCents = parseInt(total_in_cents, 10);

        if (isNaN(totalCents)) {
            console.warn("⚠️ total_in_cents no es un número:", total_in_cents);
            return res.status(400).json({ error: "El monto debe ser un número válido." });
        }

        if (totalCents < 500) { // Q5.00 mínimo
            console.warn("⚠️ Monto menor al mínimo:", totalCents);
            return res.status(400).json({ error: "El monto mínimo permitido es Q5.00 (500 centavos)" });
        }

        const data = {
            items: [
                {
                    name: `Pedido Shopify #${order_id}`,
                    amount_in_cents: totalCents,
                    currency: "GTQ",
                    quantity: 1
                }
            ],
            success_url: "https://node-express-production-0263.up.railway.app/success",
            cancel_url: "https://node-express-production-0263.up.railway.app/cancel",
            metadata: {
                order_id: order_id
            }
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

        console.log("✅ Checkout creado:", response.data.checkout_url);
        return res.redirect(response.data.checkout_url);

    } catch (error) {
        console.error("❌ Error creando checkout:", error.response?.data || error.message);
        return res.status(500).json({ error: "Error creando checkout" });
    }
});

// ✅ Redireccion exitoso -------------------------------------------------------------------------------
app.get("/success", (req, res) => {
    res.send(`
        <h1>✅ Pago exitoso</h1>
        <p>Tu pago fue completado correctamente.</p>
        <a href="https://TU_TIENDA.myshopify.com">Volver a la tienda</a>
    `);
});

// ✅ Redireccion cancelado ------------------------------------------------------------------------------
app.get("/cancel", (req, res) => {
    res.send(`
        <h1>❌ Pago cancelado</h1>
        <p>El cliente canceló el pago.</p>
        <a href="https://TU_TIENDA.myshopify.com">Volver a la tienda</a>
    `);
});


// ✅ ENDPOINT DEL WEBHOOK DE RECURRENTE (con validación) ------------------------------------------------
app.post("/webhook", bodyParser.raw({ type: "application/json" }), async (req, res) => {
    const headers = req.headers;
    const payload = req.body;

    console.log("🚩 Webhook recibido");

    if (process.env.ENABLE_WEBHOOK_VALIDATION === "true") {
        try {
            const wh = new Webhook(process.env.SVIX_SECRET);
            console.log("📩 Headers:", headers);
            console.log("📦 Payload (buffer):", payload.toString());
            console.log("🔐 SVIX_SECRET usado:", process.env.SVIX_SECRET);

            const evt = wh.verify(payload, headers);

            console.log("✅ Webhook recibido y verificado");
            console.log("🟣 Evento:", evt.event_type);
            console.log("📦 Datos recibidos:", JSON.stringify(evt.data, null, 2));

            if (evt.event_type === "payment_intent.succeeded") {
                const data = evt.data;

                const checkoutId = data?.checkout?.id;
                const amount = data?.amount_in_cents / 100;
                const currency = data?.currency;
                const createdAt = data?.created_at;
                const orderId = data?.checkout?.metadata?.order_id;
                const email = data?.customer?.email;

                console.log("💰 Pago exitoso (verificado)");
                console.log({
                    order_id: orderId,
                    checkout_id: checkoutId,
                    amount: `Q${amount}`,
                    currency,
                    fecha: createdAt,
                    email
                });

                const logLine = `${new Date().toISOString()} | order_id=${orderId} | checkout=${checkoutId} | amount=Q${amount} | email=${email}\n`;

                fs.appendFile("pagos.log", logLine, (err) => {
                    if (err) {
                        console.error("❌ Error guardando en pagos.log:", err.message);
                    } else {
                        console.log("📝 Pago registrado en pagos.log (con verificación)");
                    }
                });
            } else {
                console.log("🔔 Evento recibido pero no es de tipo payment_intent.succeeded");
            }

            return res.status(200).json({ received: true });
        } catch (err) {
            console.error("❌ Webhook inválido:", err.message);
            return res.status(400).json({ error: "Webhook no verificado" });
        }
    } else {
        // MODO SIN VERIFICACIÓN DE FIRMA
        const payload = JSON.parse(req.body.toString()); // ← Aquí sí puedes parsear
        console.log("⚠ Webhook aceptado SIN verificación de firma");
        console.log("Payload recibido:", payload);

        if (payload?.event_type === "payment_intent.succeeded") {
            const checkoutId = payload?.checkout?.id;
            const amount = payload?.amount_in_cents / 100;
            const currency = payload?.currency;
            const createdAt = payload?.created_at;
            const orderId = payload?.checkout?.metadata?.order_id;
            const email = payload?.customer?.email;

            console.log("💰 Pago exitoso (sin validación)");
            console.log({
                order_id: orderId,
                checkout_id: checkoutId,
                amount: `Q${amount}`,
                currency,
                fecha: createdAt,
                email
            });

            const logLine = `${new Date().toISOString()} | order_id=${orderId} | checkout=${checkoutId} | amount=Q${amount} | email=${email}\n`;

            fs.appendFile("pagos.log", logLine, (err) => {
                if (err) {
                    console.error("❌ Error guardando en pagos.log:", err.message);
                } else {
                    console.log("📝 Pago registrado en pagos.log");
                }
            });
        } else {
            console.log("🔔 Evento recibido pero no es de tipo payment_intent.succeeded");
        }

        return res.status(200).json({ received: true });
    }
});

app.all("/webhook", (req, res, next) => {
    console.log("🚦 Intento de acceso a webhook", req.method);
    next();
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
