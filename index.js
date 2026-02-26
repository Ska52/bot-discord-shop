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

// --- 1. SERVEUR WEB (Indispensable pour Railway) ---
const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("Bot Boutique Opérationnel 🚀");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[SERVEUR] Serveur Web actif sur le port ${PORT}`);
});

// --- 2. VÉRIFICATION ET CHARGEMENT DU TOKEN ---
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ ERREUR CRITIQUE : La variable 'TOKEN' est vide sur Railway !");
  console.log("Vérifie l'onglet 'Variables' de ton projet Railway.");
  process.exit(1); 
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let shop = []; // Boutique temporaire

// --- 3. DÉFINITION DES COMMANDES SLASH ---
const commands = [
  new SlashCommandBuilder()
    .setName("add")
    .setDescription("Ajouter un article à la boutique")
    .addStringOption(opt => opt.setName("nom").setDescription("Nom de l'article").setRequired(true))
    .addIntegerOption(opt => opt.setName("prix").setDescription("Prix en euros").setRequired(true))
    .addStringOption(opt => opt.setName("image").setDescription("URL de l'image (optionnel)").setRequired(false)),

  new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Afficher la boutique complète")
].map(cmd => cmd.toJSON());

// --- 4. ENREGISTREMENT DES COMMANDES AU DÉMARRAGE ---
client.once("ready", async () => {
  console.log(`🤖 Bot connecté en tant que ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    console.log("⏳ Enregistrement des commandes Slash en cours...");
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log("✅ Commandes enregistrées avec succès !");
  } catch (error) {
    console.error("❌ Erreur REST lors de l'enregistrement :");
    console.error(error);
  }
});

// --- 5. GESTION DES INTERACTIONS ---
client.on("interactionCreate", async (interaction) => {
  
  // COMMANDES SLASH
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "add") {
      if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({ content: "❌ Seuls les Admins peuvent ajouter des articles.", ephemeral: true });
      }

      const item = {
        id: Date.now().toString(),
        nom: interaction.options.getString("nom"),
        prix: interaction.options.getInteger("prix"),
        image: interaction.options.getString("image"),
        stock: true
      };

      shop.push(item);
      return interaction.reply(`✅ L'article **${item.nom}** a été ajouté !`);
    }

    if (interaction.commandName === "shop") {
      if (shop.length === 0) return interaction.reply("🛒 La boutique est actuellement vide.");

      await interaction.reply({ content: "🛍️ Voici nos articles disponibles :", ephemeral: true });

      for (const item of shop) {
        const embed = new EmbedBuilder()
          .setTitle(item.nom)
          .setDescription(`💰 **Prix :** ${item.prix}€\n📦 **État :** ${item.stock ? "Disponible" : "Rupture"}`)
          .setColor(item.stock ? 0x00FF00 : 0xFF0000);

        if (item.image) embed.setImage(item.image);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`buy_${item.id}`)
            .setLabel("Acheter")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!item.stock),
          new ButtonBuilder()
            .setCustomId(`stock_${item.id}`)
            .setLabel("Gérer Stock")
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
      }
    }
  }

  // BOUTONS
  if (interaction.isButton()) {
    const [action, id] = interaction.customId.split("_");
    const item = shop.find(i => i.id === id);

    if (!item) return interaction.reply({ content: "❌ Article introuvable.", ephemeral: true });

    if (action === "stock") {
      if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({ content: "Admin seulement.", ephemeral: true });
      }
      item.stock = !item.stock;
      return interaction.reply({ content: `🔄 Le stock de **${item.nom}** est maintenant ${item.stock ? "disponible" : "épuisé"}.`, ephemeral: true });
    }

    if (action === "buy") {
      return interaction.reply({ content: `🛒 **${interaction.user.username}** s'intéresse à l'article **${item.nom}** !`, ephemeral: false });
    }
  }
});

// --- 6. CONNEXION ---
client.login(TOKEN).catch(err => {
  console.error("❌ ERREUR LOGIN : Le Token est invalide.");
  console.error(err.message);
});
