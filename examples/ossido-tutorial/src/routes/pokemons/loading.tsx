// src/routes/pokemons/loading.tsx
// Shown as the Suspense fallback while a `/pokemons/*` page loads its data on
// client-side navigation.
import type { JSX } from 'react';

export default function PokemonLoading(): JSX.Element {
  return (
    <>
      <title>Pokemon: loading...</title>
      <p className="loading">Loading…</p>
    </>
  );
}
