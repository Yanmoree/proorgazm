import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { finishLoader } from './lib/loader.js'
import { photos } from './data/site.js'
import './styles/global.css'
import './styles/components.css'
import './styles/pages.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

// Главное фото первого экрана подгружаем, пока виден экран загрузки
finishLoader({ heroSrc: location.pathname === '/' ? photos.hero.replace(/-1200\.webp$/, window.innerWidth < 700 ? '-640.webp' : '-1200.webp') : '' })
