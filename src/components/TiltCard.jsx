import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

// Лёгкий 3D-наклон карточки за курсором + световой блик
export default function TiltCard({ children, className = '', max = 8, ...rest }) {
  const ref = useRef(null)
  const x = useMotionValue(0.5)
  const y = useMotionValue(0.5)
  const sx = useSpring(x, { stiffness: 150, damping: 18 })
  const sy = useSpring(y, { stiffness: 150, damping: 18 })
  const rotateX = useTransform(sy, [0, 1], [max, -max])
  const rotateY = useTransform(sx, [0, 1], [-max, max])
  const glareX = useTransform(sx, [0, 1], ['0%', '100%'])
  const glareY = useTransform(sy, [0, 1], ['0%', '100%'])

  const onMove = (e) => {
    if (e.pointerType !== 'mouse') return
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - r.left) / r.width)
    y.set((e.clientY - r.top) / r.height)
  }
  const onLeave = () => { x.set(0.5); y.set(0.5) }

  return (
    <motion.div
      ref={ref}
      className={`tilt ${className}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 900, '--gx': glareX, '--gy': glareY }}
      {...rest}
    >
      {children}
      <span className="tilt__glare" aria-hidden="true" />
    </motion.div>
  )
}
