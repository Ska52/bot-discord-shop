const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const app = express();

const TOKEN = process.env.TOKEN;

console.log("TOKEN RAW =", JSON.stringify(TOKEN));

if (!TOKEN) {
  console.log("❌ TOKEN NON DEFINI");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log("✅ CONNECTE :", client.user.tag);
});

client.login(TOKEN);

app.get("/", (req, res) => {
  res.send("Bot running");
});

app.listen(process.env.PORT || 8080, () => {
  console.log("Server started");
});
