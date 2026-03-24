// @ts-nocheck
/**
 * Sentry error tracking integration.
 * Wraps Sentry SDK calls so they're no-ops when NEXT_PUBLIC_SENTRY_DSN is not set.
 * Install: npm install @sentry/nextjs
 */

let sentryInitialised = false;

async function getSentry() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = await import("@sentry/nextjs" as string) as any;
    if (!sentryInitialised) {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1,
      });
      sentryInitialised = true;
    }
    return Sentry;
  } catch {
    return null;
  }
}

export async function captureException(error: unknown, context?: Record<string, unknown>) {
  const Sentry = await getSentry();
  if (!Sentry) {
    console.error("[Error]", error, context);
    return;
  }
  Sentry.withScope((scope: any) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}

export async function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  const Sentry = await getSentry();
  if (!Sentry) {
    console.log(`[${level.toUpperCase()}]`, message);
    return;
  }
  Sentry.captureMessage(message, level);
}
