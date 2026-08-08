// Vendored from reactbits.dev (https://reactbits.dev), MIT license — https://github.com/DavidHDev/react-bits
import { useInView, useMotionValue, useSpring } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface CountUpProps {
  to: number;
  from?: number;
  direction?: 'up' | 'down';
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  /** Custom formatter for the counted value (e.g. currency/percent). */
  format?: (n: number) => string;
  onStart?: () => void;
  onEnd?: () => void;
}

/** Number of non-zero fractional digits in `num` (1.50 → 2, 1.00 → 0, 12 → 0). */
export function getDecimalPlaces(num: number): number {
  const str = num.toString();
  if (str.includes('.')) {
    const decimals = str.split('.')[1];
    if (parseInt(decimals) !== 0) {
      return decimals.length;
    }
  }
  return 0;
}

/** Round `value` to `decimals` places (0 → nearest integer). */
export function roundToPrecision(value: number, decimals: number): number {
  return decimals > 0 ? Number(value.toFixed(decimals)) : Math.round(value);
}

export default function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className = '',
  startWhen = true,
  separator = '',
  format,
  onStart,
  onEnd
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimatedRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const motionValue = useMotionValue(direction === 'down' ? to : from);

  const damping = 20 + 40 * (1 / duration);
  const stiffness = 100 * (1 / duration);

  const springValue = useSpring(motionValue, {
    damping,
    stiffness
  });

  const isInView = useInView(ref, { once: true, margin: '0px' });

  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  const formatValue = useCallback(
    (latest: number) => {
      // Round the live spring value to the precision of the target so integer
      // counts never flash decimals mid-animation (e.g. 12.34 → 12), while
      // genuine fractional values (scores, percentages) keep their decimals.
      const rounded = roundToPrecision(latest, maxDecimals);

      if (format) return format(rounded);

      const hasDecimals = maxDecimals > 0;

      const options: Intl.NumberFormatOptions = {
        useGrouping: !!separator,
        minimumFractionDigits: hasDecimals ? maxDecimals : 0,
        maximumFractionDigits: hasDecimals ? maxDecimals : 0
      };

      const formattedNumber = Intl.NumberFormat('en-US', options).format(rounded);

      return separator ? formattedNumber.replace(/,/g, separator) : formattedNumber;
    },
    [maxDecimals, separator, format]
  );

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = formatValue(direction === 'down' ? to : from);
    }
  }, [from, to, direction, formatValue]);

  useEffect(() => {
    if (prefersReducedMotion) {
      if (ref.current) ref.current.textContent = formatValue(direction === 'down' ? from : to);
      return;
    }

    if (isInView && startWhen) {
      if (hasAnimatedRef.current) {
        if (ref.current) ref.current.textContent = formatValue(to);
        return;
      }

      if (typeof onStart === 'function') {
        onStart();
      }

      const timeoutId = setTimeout(() => {
        hasAnimatedRef.current = true;
        motionValue.set(direction === 'down' ? from : to);
      }, delay * 1000);

      const durationTimeoutId = setTimeout(
        () => {
          if (typeof onEnd === 'function') {
            onEnd();
          }
        },
        delay * 1000 + duration * 1000
      );

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(durationTimeoutId);
      };
    }
  }, [isInView, startWhen, motionValue, direction, from, to, delay, onStart, onEnd, duration, prefersReducedMotion]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest: number) => {
      if (ref.current) {
        ref.current.textContent = formatValue(latest);
      }
    });

    return () => unsubscribe();
  }, [springValue, formatValue]);

  return <span className={className} ref={ref} />;
}
