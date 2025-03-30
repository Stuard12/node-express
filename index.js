import express from "express";

const app = express();

console.log(process.env.MI_VARIABLE);

app.get("/", (req, res) => {
  res.send(`Valor de MI_VARIABLE: ${process.env.MI_VARIABLE || "No definida"}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor escuchando en puerto",PORT);
});
