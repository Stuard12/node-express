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
app.use("/webhook", bodyParser.raw({ type: "application/json" }));

// ✅ ENDPOINT DE CREACIÓN DEL CHECKOUT (Shopify lo usará)
app.post("/crear-checkout", async (req, res) => {
    try {
        console.log("✅ Recibido POST en /crear-checkout");

        const { order_id, total_in_cents } = req.body;

        // Validación fuerte
        if (!order_id || !total_in_cents) {
            return res.status(400).json({ error: "Faltan datos obligatorios." });
        }

        const totalCents = parseInt(total_in_cents, 10);

        if (isNaN(totalCents) || totalCents < 100) {  // 🚩 Puedes ajustar mínimo a Q1.00 = 100
            return res.status(400).json({ error: "Monto inválido. Debe ser mínimo Q1.00 (100 centavos)" });
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
app.post("/webhook", async (req, res) => {
    const headers = req.headers;
    const payload = req.body;

    try {
        const wh = new Webhook(process.env.SVIX_SECRET);
        const evt = wh.verify(payload, headers);

        console.log("✅ Webhook recibido y verificado");
        console.log("Tipo de evento:", evt.type);
        console.log("Datos:", evt.data);

        // Validamos que sea un pago exitoso
        if (evt.type === "payment_intent.succeeded") {
            const checkoutId = evt.data?.checkout_id;
            const orderId = evt.data?.metadata?.order_id || "desconocido";

            console.log(`💰 Pago exitoso detectado para Order ID: ${orderId} Checkout ID: ${checkoutId}`);
            
            // 💡 Aquí es donde luego puedes:
            // - Confirmar pedido en Shopify
            // - Enviar correo al cliente
            // - Guardar en base de datos

            res.status(200).json({ received: true });
        } else {
            console.log("🔔 Evento recibido pero no es de pago exitoso");
            res.status(200).json({ received: true });
        }

    } catch (err) {
        console.error("❌ Error validando webhook:", err.message);
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
