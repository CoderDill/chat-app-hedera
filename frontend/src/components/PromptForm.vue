<template>
  <div class="chat-container">
    <div class="message-area">
      <ul>
        <li v-for="msg in history" :key="msg.id" :class="msg.type">
          {{ msg.content }}
        </li>
      </ul>
    </div>
    <div class="input-area">
      <input
        v-model="prompt"
        placeholder="Type your message"
        @keyup.enter="submitPrompt"
      />
      <button @click="submitPrompt" :disabled="isLoading">
        {{ isLoading ? "Sending..." : "Send" }}
      </button>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      prompt: "",
      history: [],
      isLoading: false,
    };
  },
  mounted() {
    this.loadMessages();
  },
  methods: {
    async loadMessages() {
      try {
        const res = await axios.get("http://localhost:3000/search");
        this.history = res.data.messages;
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    },
    async submitPrompt() {
      if (!this.prompt.trim()) return;
      this.isLoading = true;
      try {
        await axios.post("http://localhost:3000/message", {
          message: this.prompt,
        });
        this.prompt = "";
        this.loadMessages(); // Refresh history
      } catch (error) {
        alert("Failed to send message. Try again.");
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  margin: 0;
  padding: 0;
}

.message-area {
  flex-grow: 1;
  overflow-y: auto;
  padding: 10px;
}

.message-area ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
}

.message-area li {
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 10px;
  max-width: 80%;
}

.user {
  background-color: #dcf8c6; /* Light green for user messages */
  align-self: flex-end;
  text-align: right;
  color: #2c3e50; /* Darker color for readability */
}

.llm {
  background-color: #ffffff; /* White for LLM messages */
  align-self: flex-start;
  text-align: left;
  color: #2c3e50;
  border: 1px solid #eee; /* Subtle border for definition */
}

.input-area {
  display: flex;
  padding: 10px;
  background-color: #f1f1f1; /* Light gray background */
}

.input-area input {
  flex-grow: 1;
  margin-right: 10px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 14px;
}

.input-area button {
  background-color: #4caf50; /* Green button */
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
}

.input-area button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>

<style>
/* Ensure no default margins push the layout */
body,
html {
  margin: 0;
  padding: 0;
}
</style>
