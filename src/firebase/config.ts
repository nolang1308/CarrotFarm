import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import {
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth'

// 환경변수는 .env.local 에 채운다 (.env.example 참고)

/** Firebase 키가 채워져 있는지 (없으면 로그인 화면에서 안내) */
export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY,
)

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

/**
 * Capacitor 네이티브 웹뷰(capacitor:// 등 비 http 스킴)에서는 getAuth 의
 * 기본 초기화가 멈춰 버리는 문제가 있어, indexedDB 저장소로 명시 초기화한다.
 */
const isNativeShell =
  typeof window !== 'undefined' &&
  window.location.protocol.startsWith('capacitor')

export const auth = isNativeShell
  ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
  : getAuth(app)
