import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      offset={{ top: 56, right: 20 }}
      closeButton
      toastOptions={{
        classNames: {
          toast: '!bg-counterfoil !border !border-rule !rounded-md !shadow-lifted !font-sans !text-ink',
          error: '!bg-signal !text-counterfoil !border-signal',
          warning: '!bg-buff !text-buff-ink !border-buff-ink/30',
          description: '!text-[13.5px] !text-current !opacity-90',
          actionButton: '!bg-ink !text-counterfoil !font-semibold'
        }
      }}
    />
  </React.StrictMode>,
)
