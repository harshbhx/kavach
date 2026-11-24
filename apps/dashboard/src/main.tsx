import '@fontsource/rozha-one/400.css'
import '@fontsource-variable/anek-latin/index.css'
import '@fontsource-variable/jetbrains-mono/index.css'
import '@fontsource/herr-von-muellerhoff/400.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
