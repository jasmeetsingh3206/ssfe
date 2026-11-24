import './assets/main.css'
import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'
import App from './App.vue'
import router from './router'

const Corporate = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{slate.50}',
      100: '{slate.100}',
      200: '{slate.200}',
      300: '{slate.300}',
      400: '{slate.400}',
      500: '{slate.500}',
      600: '{slate.600}',
      700: '{slate.700}',
      800: '{slate.800}',
      900: '{slate.900}',
      950: '{slate.950}',
    },
    formField: {
      sm: { fontSize: '0.875rem', paddingX: '0.5rem', paddingY: '0.25rem' },
    },
    colorScheme: {
      light: {
        primary: {
          color: '{slate.900}',
          contrastColor: '#ffffff',
          hoverColor: '{slate.800}',
          activeColor: '{slate.700}',
        },
      },
    },
  },
  components: {
    button: {
      root: { sm: { iconOnlyWidth: '1.75rem' } },
    },
    tooltip: {
      colorScheme: {
        light: { root: { background: '{surface.0}', color: '{surface.700}' } },
      },
    },
  },
})

const app = createApp(App)

app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Corporate,
    options: {
      darkModeSelector: false,
      cssLayer: { name: 'primevue', order: 'theme, base, primevue' },
    },
  },
})

app.use(ConfirmationService)

app.mount('#app')
