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

// --- SERVEUR EXPRESS ---
const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("Bot Online 🚀");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[SERVEUR] Prêt sur le port ${PORT}`);
});

// --- CONFIGURATION BOT ---
const TOKEN = process.env.TOKEN;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let shop = [];

// --- COMMANDES SLASH ---
const commands = [
  new SlashCommandBuilder()
    .setName("add")
    .setDescription("Ajouter un article")
    .addStringOption(opt => opt.setName("nom").setDescription("Nom").setRequired(true))
    .addIntegerOption(opt => opt.setName("prix").setDescription("Prix").setRequired(true))
    .addStringOption(opt => opt.setName("image").setDescription("URL Image")),
  new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Afficher la boutique")
].map(command => command.toJSON());

// --- READY ---
client.once("ready", async () => {
  console.log(`🤖 Connecté : ${client.user.tag}`);
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("✅ Commandes enregistrées !");
  } catch (error) {
    console.error(error);
  }
});

// --- INTERACTIONS ---
client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "add") {
      if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({ content: "Admin seulement.", ephemeral: true });
      }

      const item = {
        id: Date.now().toString(),
        nom: interaction.options.getString("nom"),
        prix: interaction.options.getInteger("prix"),
        image: interaction.options.getString("image"),
        stock: true
      };

      shop.push(item);
      return interaction.reply(`✅ **${item.nom}** ajouté !`);
    }

    if (interaction.commandName === "shop") {
      if (shop.length === 0) return interaction.reply("La boutique est vide.");
      
      await interaction.reply({ content: "🛍️ Voici les articles :", ephemeral: true });

      for (const item of shop) {
        const embed = new EmbedBuilder()
          .setTitle(item.nom)
          .setDescription(`Prix : ${item.prix}€`)
          .setColor(item.stock ? "Green" : "Red");

        if (item.image) embed.setImage(item.image);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`buy_${item.id}`)
            .setLabel("Acheter")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!item.stock),
          new ButtonBuilder()
            .setCustomId(`stock_${item.id}`)
            .setLabel("Stock (Admin)")
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
      }
    }
  }

  if (interaction.isButton()) {
    const [action, id] = interaction.customId.split("_");
    const item = shop.find(i => i.id === id);

    if (!item) return;

    if (action === "stock") {
      if (!interaction.member.permissions.has("Administrator")) return;
      item.stock = !item.stock;
      return interaction.reply({ content: `Stock mis à jour pour ${item.nom}`, ephemeral: true });
    }

    if (action === "buy") {
      return interaction.reply({ content: `🛒 ${interaction.user.username} veut acheter ${item.nom} !` });
    }
  }
});

// --- CONNEXION ---
client.login(TOKEN).catch(err => {
  console.error("❌ LOGIN DÉFAUT : Vérifie ton TOKEN sur Railway.");
  console.error(err.message);
});
