import type { TileState } from '../../store/gameStore'
import { carrotStageTexture } from '../../game/textures'

interface CarrotProps {
  growth: TileState['growth']
}

/**
 * 성장 단계별 당근을 도트 스프라이트로 표시.
 * <sprite> 는 항상 카메라를 바라보므로(빌보드) 픽셀 아트가 정면으로 보인다.
 * 단계: 1 씨 · 2 새싹 · 3 줄기 · 4 당근꽃 · 5 작은열매 · 6 당근(수확 가능)
 */
export default function Carrot({ growth }: CarrotProps) {
  if (growth < 1) return null
  const texture = carrotStageTexture(growth)

  return (
    <sprite position={[0, 0.85, 0]} scale={[1.3, 1.3, 1]}>
      <spriteMaterial
        map={texture}
        transparent
        alphaTest={0.4}
        toneMapped={false} // 톤 매핑으로 도트 색이 바래지 않게
      />
    </sprite>
  )
}
