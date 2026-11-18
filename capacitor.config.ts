import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.convertly.unitconverter',
  appName: 'Convertly',
  webDir: 'dist',
  backgroundColor: '#0f1013',
  android: {
    allowMixedContent: false,
  },
}

export default config
