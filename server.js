const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const https = require("https");

const app = express();
const port = 3001;

const CLIENT_ID = "bbb5aeca9dc44461bd8155c143a25d2c";
const CLIENT_SECRET = "dd986e144d834f1188ce4448fba101d5";
const REDIRECT_URI = "https://192.168.1.15:3000/callback";

app.use(
  cors({
    origin: "https://192.168.1.15:3000",
    credentials: true,
  })
);

app.get("/spotify/exchange", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: "Missing code" });

  try {
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", REDIRECT_URI); // usa redirect_uri frontend
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);

    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      params,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    fs.writeFileSync(
      "spotify-tokens.json",
      JSON.stringify(tokenResponse.data, null, 2)
    );

    res.json(tokenResponse.data);
  } catch (err) {
    console.error("Errore scambio token:", err.response?.data || err);
    res.status(500).json({ error: "Errore nello scambio token" });
  }
});

app.get("/spotify/refresh", async (req, res) => {
  const refresh_token = req.query.refresh_token;
  if (!refresh_token) {
    return res.status(400).json({ error: "Missing refresh_token" });
  }

  try {
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refresh_token);

    const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${authHeader}`,
        },
      }
    );

    res.json({
      access_token: tokenResponse.data.access_token,
      expires_in: tokenResponse.data.expires_in,
    });
  } catch (err) {
    console.error("Errore refresh token Spotify:", err.response?.data || err);
    res.status(500).json({ error: "Errore refresh token" });
  }
});


const httpsOptions = {
  key: fs.readFileSync("./192.168.1.15-key.pem"),
  cert: fs.readFileSync("./192.168.1.15.pem"),
};

https.createServer(httpsOptions, app).listen(port, () => {
  console.log(
    `✅ Spotify server HTTPS in ascolto su https://192.168.1.15:${port}`
  );
});
