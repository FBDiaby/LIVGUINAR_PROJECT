const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend Liv'Guinar+ fonctionne 🚀");
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log("Serveur lancé sur le port " + PORT);
});