import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import InputNumber from 'primevue/inputnumber';

const app = createApp(App)

app.use(PrimeVue, {
    theme: {
        preset: Aura
    }
});
app.use(router)
app.component("InputNumber", InputNumber)

app.mount('#app')
