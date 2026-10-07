import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/dotgothic16/400.css'
import '@fontsource/press-start-2p/400.css'
import './style.css'
import App from './App.vue'
import { useGame } from './stores/game'
import { useUi } from './stores/ui'

const app = createApp(App).use(createPinia())
app.mount('#app')
if (import.meta.env.DEV) Object.assign(window as any, { __game: useGame(), __ui: useUi() })
