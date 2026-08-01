import type { JSX } from 'react'
import type { PokemonResponse } from 'tuono/types'

export default function PokemonPage({ name }: PokemonResponse): JSX.Element {
  return <h1>Pokemon: {name}</h1>
}
