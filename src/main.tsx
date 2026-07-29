import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/fonts.scss' // 한글 지원 픽셀 폰트 (Galmuri11만)
import './styles/global.scss'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
