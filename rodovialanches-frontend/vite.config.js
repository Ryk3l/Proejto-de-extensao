import { defineConfig } from 'vite'

/**
 * Configuração do dev server.
 *
 * server.host: true → o servidor ouve em 0.0.0.0 (TODAS as interfaces de
 * rede) em vez de apenas 127.0.0.1. Assim outros dispositivos da rede
 * local acessam o sistema pelo IP desta máquina (ex.: http://192.168.0.107:5173).
 *
 * strictPort: true → sempre usa a porta 5173 (nunca pula para 5174),
 * mantendo a URL estável e a regra de firewall válida.
 */
export default defineConfig({
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
})
