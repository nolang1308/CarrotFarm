import { create } from 'zustand'
import { FirebaseError } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../firebase/config'
import { flushFarm } from '../firebase/farmSync'

/** Firebase 오류 코드 → 한국어 안내 문구 */
function messageOf(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/invalid-email':
        return '이메일 형식이 올바르지 않아요.'
      case 'auth/email-already-in-use':
        return '이미 가입된 이메일이에요. 로그인해 주세요.'
      case 'auth/weak-password':
        return '비밀번호는 6자 이상이어야 해요.'
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return '이메일 또는 비밀번호가 맞지 않아요.'
      case 'auth/too-many-requests':
        return '시도가 너무 많았어요. 잠시 후 다시 해주세요.'
      case 'auth/network-request-failed':
        return '네트워크 연결을 확인해 주세요.'
      case 'auth/invalid-api-key':
        return 'Firebase 설정이 없어요. .env.local 을 채워주세요.'
      default:
        return `문제가 생겼어요. (${err.code})`
    }
  }
  return '문제가 생겼어요. 잠시 후 다시 해주세요.'
}

interface AuthState {
  /** 로그인한 사용자 (없으면 로그인 화면) */
  user: User | null
  /** 앱 시작 시 저장된 세션을 확인하는 중인지 */
  initializing: boolean
  /** 로그인/가입 요청 진행 중인지 (버튼 비활성용) */
  busy: boolean
  /** 마지막 실패 안내 문구 */
  error: string | null
  /** 이메일/비밀번호 로그인. 성공 여부 반환 */
  signIn: (email: string, password: string) => Promise<boolean>
  /** 이메일/비밀번호 회원가입(가입 즉시 로그인됨). 성공 여부 반환 */
  signUp: (email: string, password: string) => Promise<boolean>
  /** 로그아웃 */
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  // 키가 없으면 세션 확인 자체가 불가능하므로 바로 로그인 화면으로
  initializing: isFirebaseConfigured,
  busy: false,
  error: null,

  signIn: async (email, password) => {
    set({ busy: true, error: null })
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      return true
    } catch (err) {
      set({ error: messageOf(err) })
      return false
    } finally {
      set({ busy: false })
    }
  },

  signUp: async (email, password) => {
    set({ busy: true, error: null })
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password)
      return true
    } catch (err) {
      set({ error: messageOf(err) })
      return false
    } finally {
      set({ busy: false })
    }
  },

  logout: async () => {
    // 로그아웃 후에는 Firestore 쓰기 권한이 없으므로, 밀린 변경을 먼저 저장
    await flushFarm()
    await signOut(auth)
  },

  clearError: () => set({ error: null }),
}))

// 저장된 세션 복원 + 로그인/로그아웃 반영 (앱 전체에서 한 번만 구독)
if (isFirebaseConfigured) {
  onAuthStateChanged(auth, (user) => {
    useAuthStore.setState({ user, initializing: false })
  })
}
