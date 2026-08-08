import { Building2, Shield } from 'lucide-react'
import { AmbientBackground } from '@/components/reactbits/ambient-background'
import SplitText from '@/components/reactbits/SplitText'
import ShinyText from '@/components/reactbits/ShinyText'
import FadeContent from '@/components/reactbits/FadeContent'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

interface AuthBrandingPanelProps {
  title: string
  subtitle: string
  features: string[]
}

/**
 * Left-side branding panel shown on large screens during auth flows
 * (login, signup). Ambient ReactBits canvas + animated wordmark.
 */
export function AuthBrandingPanel({ title, subtitle, features }: AuthBrandingPanelProps) {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-center items-center p-12 text-white overflow-hidden">
      <div className="absolute inset-0">
        <AmbientBackground variant="beams" className="opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/70" />
      </div>
      <div className="relative z-10 text-center">
        <div className="flex justify-center mb-8">
          <div className="p-4 rounded-full border border-white/20 bg-white/10 backdrop-blur-md">
            <Building2 className="h-16 w-16" />
          </div>
        </div>
        {prefersReducedMotion ? (
          <h1 className="text-4xl font-bold mb-4">{title}</h1>
        ) : (
          <SplitText
            text={title}
            tag="h1"
            splitType="chars"
            delay={20}
            duration={0.9}
            threshold={0}
            rootMargin="0px"
            className="text-4xl font-bold mb-4"
          />
        )}
        <ShinyText
          text={subtitle}
          speed={4}
          color="rgba(255,255,255,0.85)"
          shineColor="#ffffff"
          spread={160}
          className="text-xl mb-8"
          disabled={prefersReducedMotion}
        />
        <div className="space-y-4 text-sm">
          {features.map((f, i) => {
            const pill = (
              <p className="inline-flex items-center gap-2 rounded-cohere-pill border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-md opacity-90">
                <span className="text-cohere-coral">✓</span>
                {f}
              </p>
            )
            return prefersReducedMotion ? (
              <div key={f}>{pill}</div>
            ) : (
              <FadeContent key={f} threshold={0} duration={600} delay={200 + i * 120}>
                {pill}
              </FadeContent>
            )
          })}
        </div>
      </div>
      <div className="absolute bottom-8 left-8 z-10">
        <Shield className="h-8 w-8 opacity-50" />
      </div>
    </div>
  )
}
