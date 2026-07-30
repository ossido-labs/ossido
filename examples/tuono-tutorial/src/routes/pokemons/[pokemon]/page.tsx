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
    <>
      <title>{`Pokemon: ${pokemon.name}`}</title>
      <Link href="/" className="back-link">
        Back
      </Link>
      <PokemonView pokemon={pokemon} />
    </>
  )
}
