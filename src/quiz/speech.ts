let voice: SpeechSynthesisVoice | undefined

function pickVoice() {
  if (typeof speechSynthesis === 'undefined') return undefined
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en-us'))
  const preferred = ['Samantha', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Allison', 'Ava']
  return voices.find((v) => preferred.some((p) => v.name.includes(p))) ?? voices.find((v) => v.localService) ?? voices[0]
}

if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    voice = pickVoice()
  })
}

export function canSpeak() {
  return typeof speechSynthesis !== 'undefined'
}

export function speak(text: string) {
  if (!canSpeak()) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.replace(/(\d+)¢/g, '$1 cents'))
  voice ??= pickVoice()
  if (voice) u.voice = voice
  u.lang = 'en-US'
  u.rate = 0.9
  u.pitch = 1.05
  speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (canSpeak()) speechSynthesis.cancel()
}
