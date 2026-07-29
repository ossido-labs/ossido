// src/routes/pokemons/loading.tsx
// Shown as the Suspense fallback while a `/pokemons/*` page loads its data on
// client-side navigation.
import type { JSX } from 'react'

export default function PokemonLoading(): JSX.Element {
  return (
    <div>
      <title>Pokemon: loading...</title>
      <div>Loading...</div>
    </div>
  )
}
