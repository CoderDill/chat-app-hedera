const express = require("express");
const { client } = require("./config");
const { TopicMessageSubmitTransaction } = require("@hashgraph/sdk");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const axios = require("axios");

require("dotenv").config();

const db = new sqlite3.Database("./chat.db");

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

app.use(express.json());

async function getAIResponse(prompt) {
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
    console.log("Submitting user's prompt to Hedera...");
    const promptTransaction = new TopicMessageSubmitTransaction()
      .setTopicId(process.env.HEDERA_TOPIC_ID)
      .setMessage(message);
    const promptResponse = await promptTransaction.execute(client);
    const promptReceipt = await promptResponse.getReceipt(client);
    const promptTransactionId = promptResponse.transactionId.toString();
    console.log("User prompt transaction ID:", promptTransactionId);
    console.log("User prompt transaction status:", promptReceipt.status.toString());

    console.log("Fetching AI response from Groq...");
    const llmResponse = await getAIResponse(message);
    console.log("AI response received:", llmResponse);

    console.log("Submitting AI response to Hedera...");
    const responseTransaction = new TopicMessageSubmitTransaction()
      .setTopicId(process.env.HEDERA_TOPIC_ID)
      .setMessage(llmResponse);
    const responseResponse = await responseTransaction.execute(client);
    const responseReceipt = await responseResponse.getReceipt(client);
    const responseTransactionId = responseResponse.transactionId.toString();
    console.log("AI response transaction ID:", responseTransactionId);
    console.log("AI response transaction status:", responseReceipt.status.toString());

    console.log("Storing user message in database...");
    await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO messages (id, content, type) VALUES (?, ?, ?)",
        [promptTransactionId, message, "user"],
        (err) => {
          if (err) {
            console.error("Database insertion error (user message):", err.message);
            reject(err);
          } else {
            console.log("User message stored in database.");
            resolve();
          }
        }
      );
    });

    console.log("Storing AI response in database...");
    await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO messages (id, content, type) VALUES (?, ?, ?)",
        [responseTransactionId, llmResponse, "llm"],
        (err) => {
          if (err) {
            console.error("Database insertion error (AI response):", err.message);
            reject(err);
          } else {
            console.log("AI response stored in database.");
            resolve();
          }
        }
      );
    });

    res.json({ transactionId: promptTransactionId });
  } catch (error) {
    console.error("Error in /message endpoint:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Keep the rest of your code (e.g., /search, /api/chat, app.listen) unchanged
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