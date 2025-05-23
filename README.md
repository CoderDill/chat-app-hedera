# README: Chat App with Hedera-Backed Conversation Storage

## Project Overview
This project is a chat application that interacts with a Large Language Model (LLM) and stores conversation history (input and output) on Hedera’s decentralized ledger for permanent, immutable retention and recall. The app will use a **Python backend** and a **JavaScript frontend with Vue**, as requested. A local SQL database will index message IDs and keywords for efficient searching. The goal is to solve the issue of LLMs forgetting past outputs by providing a reliable, verifiable conversation history.

---

## Project Plan of Action
This plan outlines how to build and deploy the chat app, ensuring it’s clear and actionable.

### 1. Architecture Overview
- **Frontend (Vue.js)**: A chat interface for submitting questions, viewing responses, searching history, and verifying messages.
- **Backend (Python)**: Manages LLM API calls, stores messages on Hedera, retrieves them, and indexes them in a local SQL database.
- **Hedera Integration**: Uses the Consensus Service for immutable message storage.
- **Database**: SQLite (or another SQL database) for fast keyword-based search.

### 2. Key Features
- **Chat**: Send questions to an LLM and display responses.
- **Storage**: Save input/output pairs on Hedera with unique IDs and hashes.
- **Search**: Find past messages using keywords.
- **Verification**: Confirm message integrity with hashes.

### 3. Development Steps

#### Step 1: Set Up Development Environment
- **Install Dependencies**:
  - Python 3.x (`python --version`).
  - Node.js and npm (`node --version`, `npm --version`).
  - Vue CLI: `npm install -g @vue/cli`.
  - Hedera Python SDK: `pip install hedera`.
  - SQLite (built into Python) or another SQL database.
- **Configure Git**: Clone the repo (if created on GitHub) or initialize it locally.

#### Step 2: Set Up Hedera
- Sign up for a Hedera testnet account at [Hedera Portal](https://portal.hedera.com).
- Save your **Account ID** and **Private Key** in environment variables (e.g., `.env` file).
- Create a Consensus Service topic:
  ```python
  from hedera import Client, ConsensusTopicCreateTransaction

  client = Client.for_testnet().set_operator("YOUR_ACCOUNT_ID", "YOUR_PRIVATE_KEY")
  topic_tx = ConsensusTopicCreateTransaction().execute(client)
  topic_id = topic_tx.get_receipt(client).topic_id
  print(f"Topic ID: {topic_id}")
  ```

#### Step 3: Build the Backend (Python)
Use FastAPI (for async) or Flask (for simplicity):

`pip install fastapi uvicorn  # or pip install flask`

**Create API endpoints:**
- **/chat:** Takes a message, calls the LLM, stores it on Hedera, and indexes it.
- **/search:** Searches the database and retrieves messages from Hedera.

**Sample Backend Code:**

```
import hashlib
from fastapi import FastAPI
from hedera import Client, ConsensusSubmitMessage

app = FastAPI()
client = Client.for_testnet().set_operator("YOUR_ACCOUNT_ID", "YOUR_PRIVATE_KEY")
topic_id = "YOUR_TOPIC_ID"

def extract_keywords(text):
    return [word for word in text.split() if len(word) > 3]  # Improve with spaCy later

@app.post("/chat")
async def chat(message: str):
    llm_response = "Sample response"  # Replace with LLM API call
    message_id = "unique_id_123"  # Replace with UUID or timestamp
    full_message = f"{message_id}|{message}|{llm_response}"
    hash = hashlib.sha256(full_message.encode()).hexdigest()
    await ConsensusSubmitMessage(
        topic_id=topic_id,
        message=f"{full_message}|{hash}".encode()
    ).execute(client)
    keywords = extract_keywords(message + " " + llm_response)
    # Save to SQLite (message_id, keywords)
    return {"response": llm_response, "id": message_id}
```

#### Step 4: Build the Frontend (Vue.js)
**Create a Vue project:**
```
vue create frontend
cd frontend
npm install axios
npm run serve
```
**Build a chat UI with:**
- Input field for questions.
- Display for responses.
- Search bar for history.

**Sample Vue Code:**
```
<template>
  <div>
    <input v-model="message" @keyup.enter="sendMessage" />
    <p>{{ response }}</p>
    <input v-model="searchQuery" @keyup.enter="searchHistory" />
    <ul>
      <li v-for="msg in history" :key="msg.id">{{ msg.text }}</li>
    </ul>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() { return { message: '', response: '', searchQuery: '', history: [] }; },
  methods: {
    async sendMessage() {
      const res = await axios.post('http://localhost:8000/chat', { message: this.message });
      this.response = res.data.response;
      this.history.push({ id: res.data.id, text: res.data.response });
      this.message = '';
    },
    async searchHistory() {
      const res = await axios.get(`http://localhost:8000/search?query=${this.searchQuery}`);
      this.history = res.data.messages;
    }
  }
}
</script>
```

#### Step 5: Implement Search and Retrieval
- Index message IDs and keywords in SQLite.
- Retrieve messages from Hedera using the topic ID and sequence number (or mirror node).

#### Step 6: Add Verification
- Compare stored hashes with recalculated hashes to verify integrity.

4. Deployment
- Frontend: Host on Netlify or Vercel (drag-and-drop or CLI deploy).
- Backend: Host on AWS EC2 or Google Cloud VM (e.g., $10/month).
- Hedera Costs: ~$0.0001 per message (testnet is free).

5. Timeline
- Week 1: Set up GitHub, Hedera, and basic project structure.
- Week 2–3: Build backend with LLM and Hedera integration.
- Week 4–5: Develop frontend and connect to backend.
- Week 6: Add search and verification features.
- Week 7: Test and deploy.
