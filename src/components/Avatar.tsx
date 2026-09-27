import { avatarGradient, initials } from '../lib/format'
import styles from './Avatar.module.css'

interface AvatarProps {
  name: string
  seed: string
  size?: number
}

export function Avatar({ name, seed, size = 48 }: AvatarProps) {
  return (
    <div
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: size * 0.38, background: avatarGradient(seed) }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  )
}
