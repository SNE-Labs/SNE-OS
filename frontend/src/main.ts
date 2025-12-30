import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

// Tratamento de erros global
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
  // Não prevenir default para ver o erro no console
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  // Não prevenir default para ver o erro no console
})

try {
  const app = createApp(App)

  app.use(createPinia())
  app.use(router)

  app.mount('#app')
} catch (error) {
  console.error('Failed to mount app:', error)
  // Mostrar mensagem de erro na tela
  document.getElementById('app')!.innerHTML = `
    <div style="color: #ff5555; padding: 2rem; font-family: monospace;">
      <h1>Erro ao inicializar aplicação</h1>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
      <p>Verifique o console para mais detalhes.</p>
    </div>
  `
}

