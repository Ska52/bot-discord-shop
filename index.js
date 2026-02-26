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

// --- CONFIGURATION SERVEUR WEB (Indispensable pour Railway) ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("Bot is running! 🚀"));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[SERVER] Ready on port ${PORT}`);
});

// --- NETTOYAGE DU TOKEN ---
// On retire les espaces ou guillemets accidentels qui causent l'erreur "Invalid Authorization header"
const TOKEN = process.env.TOKEN ? process.env.TOKEN.trim().replace(/['"]+/g, '') : null;

if (!TOKEN) {
  console.error("❌ ERREUR: Le TOKEN est manquant dans les variables Railway !");
  process.exit(1);
}

// --- INITIALISATION DU BOT ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let shop = []; // Stockage temporaire (effacé au redémarrage)

// --- COMMANDES ---
const commands = [
  new SlashCommandBuilder()
    .setName("add")
    .setDescription("Ajouter un article")
    .addStringOption(o => o.setName("nom").setDescription("Nom").setRequired(true))
    .addIntegerOption(o => o.setName("prix").setDescription("Prix").setRequired(true))
    .addStringOption(o => o.setName("image").setDescription("URL Image")),
  new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Voir la boutique")
].map(c => c.toJSON());

// --- ENREGISTREMENT DES COMMANDES ---
client.once("ready", async () => {
  console.log(`✅ Connecté : ${client.user.tag}`);
  
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("✅ Commandes Slash déployées !");
  } catch (err) {
    console.error("❌ Erreur de déploiement des commandes (Vérifiez votre Token) :", err.message);
  }
});

// --- GESTION DES INTERACTIONS ---
client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "add") {
      if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({ content: "Admin uniquement.", ephemeral: true });
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
      
      await interaction.reply({ content: "Chargement de la boutique...", ephemeral: true });

      for (const item of shop) {
        const embed = new EmbedBuilder()
          .setTitle(item.nom)
          .setDescription(`Prix : ${item.prix}€\nStatut : ${item.stock ? "En stock" : "Rupture"}`)
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
            .setLabel("Toggle Stock (Admin)")
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
      }
    }
  }

  if (interaction.isButton()) {
    const [action, id] = interaction.customId.split("_");
    const item = shop.find(i => i.id === id);

    if (!item) return interaction.reply({ content: "Article non trouvé.", ephemeral: true });

    if (action === "stock") {
      if (!interaction.member.permissions.has("Administrator")) return;
      item.stock = !item.stock;
      return interaction.reply({ content: `Stock mis à jour pour ${item.nom}`, ephemeral: true });
    }

    if (action === "buy") {
      return interaction.reply(`🛒 ${interaction.user.username} a commandé **${item.nom}** !`);
    }
  }
});

// --- CONNEXION ---
client.login(process.env.DISCORD_TOKEN); // Change TOKEN par DISCORD_TOKEN {
  console.error("❌ LOGIN FAILED : L'erreur vient sûrement de votre variable TOKEN sur Railway.");
  console.error("Message d'erreur :", err.message);
});

