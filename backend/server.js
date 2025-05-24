const express = require('express');
const { client } = require('./config');
const { ConsensusSubmitMessageTransaction } = require('@hashgraph/sdk');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./chat.db');

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, content TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)');
});

const app = express();

app.use(express.json()); // Parse JSON bodies

app.post('/message', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  try {
    const transaction = new ConsensusSubmitMessageTransaction()
      .setTopicId(process.env.HEDERA_TOPIC_ID)
      .setMessage(message);
    const response = await transaction.execute(client);
    const transactionId = response.transactionId.toString();

    // Store the message in the database
    db.run('INSERT INTO messages (id, content) VALUES (?, ?)', [transactionId, message], (err) => {
      if (err) {
        console.error('Database insertion error:', err.message);
        return res.status(500).json({ error: 'Failed to store message in database' });
      }
      res.json({ transactionId });
    });
  } catch (error) {
    console.error('Error submitting message to Hedera:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/search', (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  db.all('SELECT id, content FROM messages WHERE content LIKE ? ORDER BY timestamp DESC', [`%${query}%`], (err, rows) => {
    if (err) {
      console.error('Database query error:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve messages' });
    }
    res.json({ messages: rows });
  });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});