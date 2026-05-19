import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import './index.css'
import App from './App.jsx'

const bublontFontSrc = `${import.meta.env.BASE_URL}fonts/SVN-Bublont.ttf`.replace(
  /([^:]\/)\/+/g,
  '$1',
)
if (!document.getElementById('svn-bublont-face')) {
  const face = document.createElement('style')
  face.id = 'svn-bublont-face'
  face.textContent = `@font-face{font-family:'SVN Bublont';src:url('${bublontFontSrc}') format('truetype');font-weight:100 900;font-style:normal;font-display:swap;}`
  document.head.appendChild(face)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
