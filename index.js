import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Leer la variable
const mensaje = process.env.MI_VARIABLE || "No definida";

console.log("🔔 Valor de MI_VARIABLE:", mensaje);

app.get("/", (req, res) => {
  res.send(`Valor de MI_VARIABLE: ${mensaje}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
