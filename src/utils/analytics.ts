export default function trackEvent(eventName: string, props: Record<string, unknown> = {}): void {
  if (window.plausible) {
    window.plausible(eventName, { props: props })
  } else {
    const plausibleFn: NonNullable<Window['plausible']> = function (...args: unknown[]) {
      ;(plausibleFn.q = plausibleFn.q || []).push(args)
    }
    window.plausible = plausibleFn
    plausibleFn(eventName, { props: props })
  }
  if (window.posthog) {
    window.posthog.capture(eventName, props)
  }
}
