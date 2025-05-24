const express = require("express");
const { client } = require("./config");
const { TopicMessageSubmitTransaction } = require("@hashgraph/sdk");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const axios = require("axios");

require("dotenv").config(); // Load environment variables from .env file

const db = new sqlite3.Database("./chat.db");

// Create table with 'type' column
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, content TEXT, type TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)"
  );
});

const app = express();

app.use(
  cors({
    origin: "http://localhost:8080",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json()); // Parse JSON bodies

// Helper function to call OpenAI API
async function getAIResponse(prompt) {
  const axios = require('axios');
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling Groq API:", error.response ? error.response.data : error.message);
    throw new Error("Failed to get AI response");
  }
}

app.post("/message", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }
  try {
    // Submit message to Hedera (your existing code)
    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(process.env.HEDERA_TOPIC_ID)
      .setMessage(message);
    const response = await transaction.execute(client);
    const transactionId = response.transactionId.toString();

    // Call Groq API using getAIResponse
    const llmResponse = await getAIResponse(message);

    // Store user message and AI response in database (your existing code)
    db.run(
      "INSERT INTO messages (id, content, type) VALUES (?, ?, ?)",
      [transactionId, message, "user"],
      (err) => {
        if (err) {
          console.error("Database insertion error (user message):", err.message);
          return res.status(500).json({ error: "Failed to store user message" });
        }
        db.run(
          "INSERT INTO messages (id, content, type) VALUES (?, ?, ?)",
          [transactionId + "-response", llmResponse, "llm"],
          (err) => {
            if (err) {
              console.error("Database insertion error (LLM response):", err.message);
              return res.status(500).json({ error: "Failed to store LLM response" });
            }
            res.json({ transactionId });
          }
        );
      }
    );
  } catch (error) {
    console.error("Error in /message endpoint:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/search", (req, res) => {
  const { query } = req.query;
  let sql = "SELECT id, content, type FROM messages ORDER BY timestamp ASC";
  if (query) {
    sql =
      "SELECT id, content, type FROM messages WHERE content LIKE ? ORDER BY timestamp ASC";
  }
  db.all(sql, query ? [`%${query}%`] : [], (err, rows) => {
    if (err) {
      console.error("Database query error:", err.message);
      return res.status(500).json({ error: "Failed to retrieve messages" });
    }
    res.json({ messages: rows });
  });
});

app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    const aiResponse = response.data.choices[0].message.content;
    res.json({ prompt, response: aiResponse });
  } catch (error) {
    console.error(
      "Error calling GROQ API:",
      error.response ? error.response.data : error.message
    );
    throw new Error("Failed to get AI response");
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
