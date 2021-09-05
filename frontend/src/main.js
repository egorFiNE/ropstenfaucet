import { createApp } from 'vue'
import App from './App.vue'
import formatters from './formatters.js';

createApp(App).use(formatters).mount('#app')
