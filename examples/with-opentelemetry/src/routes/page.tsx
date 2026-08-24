import type { JSX } from 'react';

export default function IndexPage({
  subtitle,
}: {
  subtitle: string;
}): JSX.Element {
  return (
    <>
      <title>with-opentelemetry</title>
      <section>
        <h1>OpenTelemetry</h1>
        <p>{subtitle}</p>
        <p>
          Start with <code>OTEL_EXPORTER_OTLP_ENDPOINT</code> set and watch the
          traces arrive: this page render, and{' '}
          <a href="/api/pokemons/pikachu">/api/pokemons/pikachu</a> with its
          nested handler span.
        </p>
      </section>
    </>
  );
}
