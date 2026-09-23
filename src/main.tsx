import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getLocale } from './paraglide/runtime.js'

document.documentElement.lang = getLocale()

const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
if (manifestLink) manifestLink.href = `/manifest-${getLocale()}.webmanifest`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
