import type { JSX } from 'react'

import { Wordmark } from '../components/wordmark'
import PokemonLink from '../components/PokemonLink'

interface IndexProps {
  results: Array<{ name: string; url: string }>
}

export default function IndexPage({ results }: IndexProps): JSX.Element {
  return (
    <>
      <title>Tuono tutorial</title>
      <img src="/lightning.webp" className="background" alt="" />

      <div className="hero">
        <h1 className="title">
          <span>TU</span>
          {/* The logo stands in for the "O" visually; keep a hidden "O" so the
              heading still reads "TUONO" to screen readers, and hide the SVG. */}
          <span className="visually-hidden">O</span>
          <Wordmark aria-hidden />
          <span>NO</span>
        </h1>
        <p className="subtitle">Pick a Pokémon — a Tuono tutorial Pokédex</p>
        <div className="links">
          <a
            href="https://crates.io/crates/tuono"
            target="_blank"
            rel="noreferrer"
          >
            Crates
          </a>
          <a
            href="https://www.npmjs.com/package/tuono"
            target="_blank"
            rel="noreferrer"
          >
            Npm
          </a>
        </div>
      </div>

      <ul className="pokemon-grid">
        <PokemonLink name="GOAT" id={0} />
        {results.map((pokemon, i) => (
          <PokemonLink key={pokemon.name} name={pokemon.name} id={i + 1} />
        ))}
      </ul>
    </>
  )
}
