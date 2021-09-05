import { createApp } from 'vue'
import App from './App.vue'
import formatters from './formatters.js';

import 'bootstrap';
import './main.scss';

createApp(App).use(formatters).mount('#app')
