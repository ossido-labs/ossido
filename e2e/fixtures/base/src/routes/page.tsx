import type { JSX } from 'react'
import { Link } from 'tuono'
import type { MyResponse } from 'tuono/types'

export default function IndexPage({ subtitle }: MyResponse): JSX.Element {
  return (
    <>
      <h1>TUONO</h1>
      <h2>{subtitle}</h2>
      <nav>
        <Link href={'/second-route'}>Routing link</Link>
        <Link href={'/throws'}>Throws</Link>
        <Link href={'/rust-error'}>Rust error</Link>
        <Link href={'/pokemons/pikachu'}>Pikachu</Link>
      </nav>
    </>
  )
}
