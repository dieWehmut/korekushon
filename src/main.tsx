import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App'
import { ensurePrefetch } from './utils/prefetchCache'
import { BrowserRouter } from 'react-router-dom'

// The app is deployed under a sub-path on GitHub Pages (/korekushon/), so the
// router must be told about that prefix or every deep link would fall through
// to the catch-all route. BASE_URL comes from vite's `base` config.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

// Start fetching data as soon as the app loads
ensurePrefetch().catch(err => console.error('Initial prefetch failed', err))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename || undefined}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
