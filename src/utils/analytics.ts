/**
 * One telemetry event (CONTEXT.md: "host config"). The shape mirrors what
 * the default adapter emits, so a host handler can treat it as the
 * plausible/posthog event it replaces.
 */
export type TelemetryHandler = (eventName: string, props: Record<string, unknown>) => void

// The telemetry channel (CONTEXT.md: "host config"): call sites track
// events through this one function; the handler behind it is a port. The
// DEFAULT adapter is the historical plausible/posthog fan-out — including
// the window queue stub plausible expects before its script loads — kept
// verbatim for hosts that don't configure their own. A host's handler
// (CardConfig.telemetry) replaces the default for the whole page:
// analytics is page-global by nature (the vendors it abstracts are window
// globals), so the channel is per-page, not per-composer.

function defaultTelemetryHandler(eventName: string, props: Record<string, unknown>): void {
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

let handler: TelemetryHandler = defaultTelemetryHandler

/**
 * Registers the host's telemetry handler (undefined restores the default
 * plausible/posthog adapter). Returns a teardown that restores the default.
 */
export function setTelemetryHandler(custom: TelemetryHandler | undefined): () => void {
  handler = custom ?? defaultTelemetryHandler
  return () => {
    handler = defaultTelemetryHandler
  }
}

export default function trackEvent(eventName: string, props: Record<string, unknown> = {}): void {
  handler(eventName, props)
}
