const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const express = require("express");
const cors = require("cors");
const fs = require("fs");

const TOKEN = process.env.MTQ3NjUyMTA4ODQ4NDc2OTkzMw.G0LpPk.KuYuDRMsRYQ6R_jl7XfYXxlQ3MoDa5MVlQBWS0;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* =========================
   EXPRESS API
========================= */

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   BASE DE DONNÉES JSON
========================= */

const DATA_FILE = "./shop.json";

let shop = [];

if (fs.existsSync(DATA_FILE)) {
  shop = JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveShop() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(shop, null, 2));
}

/* =========================
   API SITE WEB
========================= */

// Récupérer produits
app.get("/api/products", (req, res) => {
  res.json(shop);
});

// Acheter depuis le site
app.post("/api/buy/:id", (req, res) => {
  const product = shop.find(p => p.id == req.params.id);

  if (product && product.stock > 0) {
    product.stock -= 1;
    saveShop();
  }

  res.json(shop);
});

// Lancer serveur API
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("API en ligne");
});

/* =========================
   BOUTIQUE DISCORD
========================= */

let shopChannelId = null;
let shopMessageId = null;

client.once("ready", () => {
  console.log(`🤖 Connecté en tant que ${client.user.tag}`);
});

async function updateShop() {
  if (!shopChannelId) return;

  const channel = await client.channels.fetch(shopChannelId);
  if (!channel) return;

  const embeds = [];
  const components = [];

  for (let product of shop) {

    const embed = new EmbedBuilder()
      .setTitle(`🛒 ${product.name}`)
      .setDescription(`Prix : ${product.price}€\nStock : ${product.stock}`)
      .setImage(product.image)
      .setColor(product.stock > 0 ? 0x00ff00 : 0xff0000);

    embeds.push(embed);

    const buyButton = new ButtonBuilder()
      .setCustomId(`buy_${product.id}`)
      .setLabel("Acheter")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(product.stock === 0);

    const stockButton = new ButtonBuilder()
      .setCustomId(`stock_${product.id}`)
      .setLabel(product.stock > 0 ? "🟢 En stock" : "🔴 Rupture")
      .setStyle(product.stock > 0 ? ButtonStyle.Success : ButtonStyle.Danger);

    components.push(
      new ActionRowBuilder().addComponents(buyButton, stockButton)
    );
  }

  if (!shopMessageId) {
    const msg = await channel.send({
      content: "🛍️ **BOUTIQUE OFFICIELLE**",
      embeds,
      components
    });
    shopMessageId = msg.id;
  } else {
    const msg = await channel.messages.fetch(shopMessageId);
    await msg.edit({ embeds, components });
  }
}

/* =========================
   COMMANDES
========================= */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Définir salon boutique
  if (message.content === "!setshop") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin seulement.");

    shopChannelId = message.channel.id;
    await updateShop();
    return message.reply("✅ Boutique définie.");
  }

  // Ajouter produit
  if (message.content.startsWith("!additem")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin seulement.");

    const args = message.content.split(" ");
    const name = args[1];
    const price = parseInt(args[2]);
    const stock = parseInt(args[3]);

    if (!name || isNaN(price) || isNaN(stock))
      return message.reply("⚠️ Utilisation : !additem nom prix stock + image");

    if (message.attachments.size === 0)
      return message.reply("⚠️ Ajoute une image.");

    const image = message.attachments.first().url;

    const newProduct = {
      id: Date.now(),
      name,
      price,
      stock,
      image
    };

    shop.push(newProduct);
    saveShop();
    await updateShop();

    return message.reply("✅ Produit ajouté.");
  }
});

/* =========================
   BOUTONS
========================= */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const id = interaction.customId;

  const productId = id.split("_")[1];
  const product = shop.find(p => p.id == productId);

  if (!product) return;

  // Achat
  if (id.startsWith("buy_")) {
    if (product.stock > 0) {
      product.stock -= 1;
      saveShop();
      await updateShop();
      return interaction.reply({ content: "✅ Achat effectué !", ephemeral: true });
    } else {
      return interaction.reply({ content: "❌ Rupture de stock.", ephemeral: true });
    }
  }

  // Changer stock admin
  if (id.startsWith("stock_")) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: "❌ Admin seulement.", ephemeral: true });

    product.stock = product.stock > 0 ? 0 : 10;
    saveShop();
    await updateShop();
    return interaction.deferUpdate();
  }
});

client.login(TOKEN);