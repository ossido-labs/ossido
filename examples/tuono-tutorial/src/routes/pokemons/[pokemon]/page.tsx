// src/routes/pokemons/[pokemon]/page.tsx
import type { JSX } from 'react'
import { Link } from 'tuono'

import PokemonView from '../../../components/PokemonView'

interface Pokemon {
  id: number
  name: string
  weight: number
  height: number
}

export default function PokemonPage(pokemon: Pokemon): JSX.Element {
  return (
    <div>
      <Link href="/">Back</Link>

      <title>{`Pokemon: ${pokemon.name}`}</title>
      <PokemonView pokemon={pokemon} />
    </div>
  )
}
