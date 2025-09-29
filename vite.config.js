import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // base: '/workout-tracker/', // décommente si tu déploies sur GitHub Pages
})
