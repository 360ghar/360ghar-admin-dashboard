import { lazy, Suspense, useState, type ComponentType } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/utils'

export type AmbientVariant = 'aurora' | 'beams' | 'threads' | 'particles' | 'orb' | 'topography'

/**
 * ReactBits canvas backgrounds, loaded lazily so the WebGL/three.js payload
 * only ships to the few surfaces that use them (auth screens, dashboard hero).
 * Reduced-motion users get a static gradient instead of a running canvas.
 */
const componentMap: Record<AmbientVariant, ComponentType> = {
  aurora: lazy(() => import('./Aurora')),
  beams: lazy(() => import('./Beams')),
  threads: lazy(() => import('./Threads')),
  particles: lazy(() => import('./Particles')),
  orb: lazy(() => import('./Orb')),
  topography: lazy(() => import('./Topography')),
}

const FALLBACK_GRADIENTS: Record<AmbientVariant, string> = {
  aurora:
    'radial-gradient(120% 100% at 50% 0%, hsl(218 77% 62% / 0.16), transparent 60%), radial-gradient(90% 90% at 85% 25%, hsl(14 100% 66% / 0.12), transparent 55%)',
  beams:
    'linear-gradient(180deg, hsl(218 77% 62% / 0.14), transparent 45%), radial-gradient(60% 80% at 50% 100%, hsl(240 12% 20%), transparent 70%)',
  threads:
    'radial-gradient(110% 90% at 30% 10%, hsl(218 77% 62% / 0.12), transparent 60%), radial-gradient(80% 80% at 75% 80%, hsl(283 21% 51% / 0.1), transparent 55%)',
  particles:
    'radial-gradient(100% 100% at 50% 50%, hsl(218 77% 62% / 0.1), transparent 70%)',
  orb: 'radial-gradient(80% 80% at 50% 50%, hsl(218 77% 62% / 0.18), transparent 70%)',
  topography:
    'radial-gradient(120% 100% at 50% 0%, hsl(240 12% 14%), transparent 70%), hsl(240 14% 5%)',
}

export interface AmbientBackgroundProps {
  variant?: AmbientVariant
  className?: string
}

export function AmbientBackground({ variant = 'aurora', className }: AmbientBackgroundProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  // WebGL is required by the ogl/three canvases; without it the lazy component
  // crashes on mount, so fall back to the static gradient when unavailable.
  const [webglSupported] = useState(() =>
    typeof document !== 'undefined' &&
    (() => {
      try {
        const c = document.createElement('canvas')
        return !!(c.getContext('webgl2') || c.getContext('webgl'))
      } catch {
        return false
      }
    })()
  )

  if (prefersReducedMotion || !webglSupported) {
    return <div aria-hidden className={cn('h-full w-full', className)} style={{ background: FALLBACK_GRADIENTS[variant] }} />
  }

  const Ambient = componentMap[variant]
  return (
    <div aria-hidden className={cn('pointer-events-none h-full w-full', className)}>
      <Suspense
        fallback={
          <div className="h-full w-full" style={{ background: FALLBACK_GRADIENTS[variant] }} />
        }
      >
        <Ambient />
      </Suspense>
    </div>
  )
}
