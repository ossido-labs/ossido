import type { JSX } from 'react'

import PokemonView from '../../../components/PokemonView'

interface Pokemon {
  id: number
  name: string
  weight: number
  height: number
}

export default function PokemonPage(pokemon: Pokemon): JSX.Element {
  return (
    <>
      <title>{`Pokemon: ${pokemon.name}`}</title>
      <PokemonView pokemon={pokemon} />
    </>
  )
}
