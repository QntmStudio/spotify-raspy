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
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.get("/spotify/exchange", async (req, res) => {
  console.log("🔄 Token exchange request received");
  console.log("Query params:", req.query);
  
  const code = req.query.code;
  if (!code) {
    console.error("❌ Missing authorization code");
    return res.status(400).json({ error: "Missing code parameter" });
  }

  try {
    console.log("🔄 Preparing token exchange with Spotify...");
    
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", REDIRECT_URI);
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);

    console.log("📡 Making request to Spotify token endpoint...");
    console.log("Params:", {
      grant_type: "authorization_code",
      code: code.substring(0, 10) + "...",
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET.substring(0, 5) + "..."
    });

    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      params,
      { 
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        timeout: 10000 // 10 second timeout
      }
    );

    console.log("✅ Spotify token response received:");
    console.log("Status:", tokenResponse.status);
    console.log("Data keys:", Object.keys(tokenResponse.data));

    // Save tokens to file for debugging
    fs.writeFileSync(
      "spotify-tokens.json",
      JSON.stringify({
        ...tokenResponse.data,
        timestamp: new Date().toISOString()
      }, null, 2)
    );

    console.log("💾 Tokens saved to file");
    
    // Send response
    res.json(tokenResponse.data);
    console.log("✅ Token exchange completed successfully");

  } catch (err) {
    console.error("❌ Token exchange error:");
    console.error("Error message:", err.message);
    
    if (err.response) {
      console.error("Spotify API response status:", err.response.status);
      console.error("Spotify API response data:", err.response.data);
      
      res.status(err.response.status).json({
        error: "Spotify API error",
        details: err.response.data,
        status: err.response.status
      });
    } else if (err.request) {
      console.error("Network error - no response received");
      res.status(500).json({
        error: "Network error",
        details: "Could not reach Spotify API"
      });
    } else {
      console.error("Unexpected error:", err);
      res.status(500).json({
        error: "Internal server error",
        details: err.message
      });
    }
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    port: port 
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const httpsOptions = {
  key: fs.readFileSync("./192.168.1.15-key.pem"),
  cert: fs.readFileSync("./192.168.1.15.pem"),
};

https.createServer(httpsOptions, app).listen(port, "192.168.1.15", () => {
  console.log(`✅ Spotify server HTTPS in ascolto su https://192.168.1.15:${port}`);
  console.log(`🔍 Health check disponibile su https://192.168.1.15:${port}/health`);
});