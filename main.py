import os
import uuid
import hashlib
from fastapi import FastAPI
from hedera import Client, ConsensusSubmitMessageTransaction
from fastapi.middleware.cors import CORSMiddleware
import sqlite3

app = FastAPI()

# Load environment variables
ACCOUNT_ID = os.getenv("HEDERA_ACCOUNT_ID")
PRIVATE_KEY = os.getenv("HEDERA_PRIVATE_KEY")
TOPIC_ID = os.getenv("HEDERA_TOPIC_ID")

# Check if credentials are set
if not all([ACCOUNT_ID, PRIVATE_KEY, TOPIC_ID]):
    raise EnvironmentError("Hedera credentials must be set in environment variables.")

# Initialize Hedera client
client = Client.for_testnet().set_operator(ACCOUNT_ID, PRIVATE_KEY)

# Set up SQLite database
conn = sqlite3.connect('chat_history.db')
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS messages
             (id TEXT PRIMARY KEY, keywords TEXT)''')
conn.commit()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_keywords(text):
    return [word for word in text.split() if len(word) > 3]

@app.post("/chat")
async def chat(message: str):
    llm_response = "Sample response"
    message_id = str(uuid.uuid4())
    full_message = f"{message_id}|{message}|{llm_response}"
    hash_value = hashlib.sha256(full_message.encode()).hexdigest()
    
    transaction = ConsensusSubmitMessageTransaction().set_topic_id(TOPIC_ID).set_message(f"{full_message}|{hash_value}".encode())
    response = transaction.execute(client)
    print(f"Message stored with transaction ID: {response.transaction_id}")
    
    keywords = extract_keywords(message + " " + llm_response)
    c.execute("INSERT INTO messages (id, keywords) VALUES (?, ?)", (message_id, ",".join(keywords)))
    conn.commit()
    return {"response": llm_response, "id": message_id}

@app.get("/search")
async def search(query: str):
    keywords = extract_keywords(query)
    c.execute("SELECT id FROM messages WHERE keywords LIKE ?", (f"%{','.join(keywords)}%",))
    message_ids = [row[0] for row in c.fetchall()]
    messages = [{"id": mid, "text": "Sample message"} for mid in message_ids]
    return {"messages": messages}