import { Wordmark } from '@/components/Wordmark';
import PokemonLink from '@/components/PokemonLink';
import type { OssidoPage } from '@ossido-labs/ossido/types';

const IndexPage: OssidoPage<'/'> = ({ results }) => {
  return (
    <>
      <title>Ossido tutorial</title>

      <div className="hero">
        <h1 className="title">
          <Wordmark aria-hidden />
        </h1>
        <p className="subtitle">Pick a Pokémon — a Ossido tutorial Pokédex</p>
        <div className="links">
          <a
            href="https://crates.io/crates/ossido"
            target="_blank"
            rel="noreferrer"
          >
            Crates
          </a>
          <a
            href="https://www.npmjs.com/package/@ossido-labs/ossido"
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
  );
};

export default IndexPage;
