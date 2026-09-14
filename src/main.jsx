import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Sovelluksen käynnistyspiste: kiinnitetään React <App/> index.html:n #root-elementtiin.
// StrictMode auttaa löytämään yleisiä virheitä kehityksessä (ei vaikuta tuotantoon).
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
