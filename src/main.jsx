import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// App entry point: mount React <App/> into the #root element from index.html.
// StrictMode surfaces common mistakes during development (no effect in production).
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
