<template>
  <div>
    <input
      v-model="message"
      @keyup.enter="sendMessage"
      placeholder="Type a message"
    />
    <p>{{ response }}</p>
    <input
      v-model="searchQuery"
      @keyup.enter="searchHistory"
      placeholder="Search history"
    />
    <ul>
      <li v-for="msg in history" :key="msg.id">{{ msg.content }}</li>
    </ul>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      message: "",
      response: "",
      searchQuery: "",
      history: [],
    };
  },
  methods: {
    async sendMessage() {
      try {
        const res = await axios.post("http://localhost:3000/message", {
          message: this.message,
        });
        this.response = `Message sent with ID: ${res.data.transactionId}`;
        this.history.push({
          id: res.data.transactionId,
          content: this.message,
        });
        this.message = "";
      } catch (error) {
        console.error("Error sending message:", error);
        this.response = "Failed to send message.";
      }
    },
    async searchHistory() {
      try {
        const res = await axios.get(
          `http://localhost:3000/search?query=${encodeURIComponent(
            this.searchQuery
          )}`
        );
        this.history = res.data.messages || [];
      } catch (error) {
        console.error("Error searching history:", error);
        this.history = [];
      }
    },
  },
};
</script>
