import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { carrotUrl } from './pixel'
import './styles/fonts.scss'
import './styles/global.scss'

// 파비콘도 코드가 그린 도트 당근으로 (외부 이미지 없음)
const favicon = document.createElement('link')
favicon.rel = 'icon'
favicon.type = 'image/png'
favicon.href = carrotUrl()
document.head.appendChild(favicon)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
