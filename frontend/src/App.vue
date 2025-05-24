<template>
  <div id="app">
    <PromptForm />
  </div>
</template>

<script>
import PromptForm from "./components/PromptForm.vue";

export default {
  name: "App",
  components: {
    PromptForm,
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
}
</style>
