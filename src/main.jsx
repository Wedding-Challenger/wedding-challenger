import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { BudgetProvider } from './context/BudgetContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <BudgetProvider>
        <App />
      </BudgetProvider>
    </BrowserRouter>
  </StrictMode>,
)
