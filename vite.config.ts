import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' keeps asset paths relative so the same build works on the web and inside the Android WebView.
export default defineConfig({
  base: './',
  plugins: [react()],
})
