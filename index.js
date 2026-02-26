const { Client, GatewayIntentBits, Partials } = require("discord.js");
const express = require("express");
const cors = require("cors");

// ================= CONFIG =================

const TOKEN = process.env.TOKEN?.trim();

if (!TOKEN) {
  console.error("❌ TOKEN manquant dans les variables Railway !");
  process.exit(1);
}

// ================= DISCORD =================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once("ready", () => {
  console.log(`🤖 Bot connecté en tant que ${client.user.tag}`);
});

// ================= SHOP DATA =================

let shop = [
  {
    id: 1,
    name: "Nitro",
    price: 20,
    stock: 5,
    image: "https://via.placeholder.com/400x200"
  }
];

// ================= EXPRESS API =================

const app = express();
app.use(cors());
app.use(express.json());

// Voir produits
app.get("/api/products", (req, res) => {
  res.json(shop);
});

// Acheter produit
app.post("/api/buy/:id", (req, res) => {
  const product = shop.find(p => p.id == req.params.id);

  if (!product) {
    return res.status(404).json({ error: "Produit introuvable" });
  }

  if (product.stock <= 0) {
    return res.status(400).json({ error: "Rupture de stock" });
  }

  product.stock -= 1;

  res.json(product);
});

// ================= LANCEMENT SERVEUR =================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🌍 API en ligne sur le port ${PORT}`);
});

// ================= LOGIN BOT =================


client.login(TOKEN);
const TOKEN = process.env.TOKEN?.trim();

if (!TOKEN) {
  console.error("❌ TOKEN manquant !");
  process.exit(1);
}

