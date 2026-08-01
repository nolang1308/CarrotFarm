import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/fonts.scss' // 한글 지원 픽셀 폰트 (Galmuri11만)
import './styles/global.scss'

// Electron 투명 위젯이 아닌 곳(브라우저·모바일 앱)에서는 하늘+잔디 배경을 깐다
if (!window.electronAPI) document.body.classList.add('web-bg')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
