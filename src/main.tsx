import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import './styles/variables.css'
import './styles/global.css'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/bloque', element: <App /> },
  { path: '/malla', element: <App /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
