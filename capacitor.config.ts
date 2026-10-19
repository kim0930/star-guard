import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.starguard.kids',
  appName: 'Star Guard',
  webDir: 'dist',
  backgroundColor: '#1d3557',
  ios: {
    contentInset: 'never',
    preferredContentMode: 'mobile',
  },
}

export default config
