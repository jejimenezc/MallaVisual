import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { UILayoutProvider } from './state/ui-layout.tsx'
import { ToastProvider } from './components/ui/ToastContext'
import { ConfirmProvider } from './components/ui/ConfirmContext'
import './styles/variables.css'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <UILayoutProvider>
        <ToastProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ToastProvider>
      </UILayoutProvider>
    </BrowserRouter>
  </React.StrictMode>,
)