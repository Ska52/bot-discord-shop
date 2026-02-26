const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder 
} = require("discord.js");

const express = require("express");
const cors = require("cors");

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ TOKEN manquant !");
  process.exit(1);
}

/* =========================
   EXPRESS (OBLIGATOIRE RAILWAY)
========================= */

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bot Discord Shop Online 🚀");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("🌍 API en ligne sur le port " + PORT);
});

/* =========================
   DISCORD CLIENT
========================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* =========================
   BOUTIQUE (MEMOIRE)
========================= */

let shop = [];

/* =========================
   COMMANDES SLASH
========================= */

const commands = [
  new SlashCommandBuilder()
    .setName("add")
    .setDescription("Ajouter un article (Admin seulement)")
    .addStringOption(option =>
      option.setName("nom")
        .setDescription("Nom de l'article")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("prix")
        .setDescription("Prix")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("image")
        .setDescription("URL de l'image")
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Afficher la boutique")
].map(command => command.toJSON());

client.once("ready", async () => {
  console.log(`🤖 Connecté en tant que ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log("✅ Commandes enregistrées !");
  } catch (error) {
    console.error(error);
  }
});

/* =========================
   INTERACTIONS
========================= */

client.on("interactionCreate", async interaction => {

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "add") {

      if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({ content: "❌ Admin seulement.", ephemeral: true });
      }

      const nom = interaction.options.getString("nom");
      const prix = interaction.options.getInteger("prix");
      const image = interaction.options.getString("image");

      const article = {
        id: Date.now().toString(),
        nom,
        prix,
        image,
        stock: true
      };

      shop.push(article);

      return interaction.reply(`✅ Article **${nom}** ajouté !`);
    }

    if (interaction.commandName === "shop") {

      if (shop.length === 0) {
        return interaction.reply("🛒 Boutique vide.");
      }

      for (const item of shop) {

        const embed = new EmbedBuilder()
          .setTitle(item.nom)
          .setDescription(`💰 Prix: ${item.prix}€`)
          .setColor(item.stock ? "Green" : "Red");

        if (item.image) embed.setImage(item.image);

        const stockButton = new ButtonBuilder()
          .setCustomId("stock_" + item.id)
          .setLabel(item.stock ? "En Stock" : "Rupture")
          .setStyle(item.stock ? ButtonStyle.Success : ButtonStyle.Danger);

        const buyButton = new ButtonBuilder()
          .setCustomId("buy_" + item.id)
          .setLabel("Acheter")
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(stockButton, buyButton);

        await interaction.channel.send({
          embeds: [embed],
          components: [row]
        });
      }

      return interaction.reply({ content: "🛍️ Boutique affichée !", ephemeral: true });
    }
  }

  if (interaction.isButton()) {

    const [action, id] = interaction.customId.split("_");
    const item = shop.find(i => i.id === id);

    if (!item) return;

    if (action === "stock") {

      if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({ content: "❌ Admin seulement.", ephemeral: true });
      }

      item.stock = !item.stock;

      return interaction.reply({
        content: `🔄 Stock mis à jour pour ${item.nom}`,
        ephemeral: true
      });
    }

    if (action === "buy") {

      if (!item.stock) {
        return interaction.reply({ content: "❌ Article en rupture.", ephemeral: true });
      }

      return interaction.reply({
        content: `🛒 ${interaction.user.username} a acheté ${item.nom} !`,
        ephemeral: false
      });
    }
  }
});

client.login(TOKEN);
