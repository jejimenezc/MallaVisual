import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { UILayoutProvider } from './state/ui-layout.tsx'
import { ToastProvider } from './ui/toast/ToastContext.tsx'
import { ConfirmProvider } from './ui/confirm/ConfirmContext.tsx'
import './styles/variables.css'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <UILayoutProvider>
            <App />
          </UILayoutProvider>
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  </React.StrictMode>,
)