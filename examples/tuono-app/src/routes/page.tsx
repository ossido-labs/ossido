import type { JSX } from 'react'
import type { TuonoPage } from 'tuono/types'

import { Wordmark } from '../components/wordmark.tsx'

interface NavLink {
  href: string
  label: string
  desc: string
}

const LINKS: ReadonlyArray<NavLink> = [
  {
    href: 'https://github.com/tuono-labs/tuono',
    label: 'GitHub',
    desc: 'Star the repo',
  },
  {
    href: 'https://crates.io/crates/tuono',
    label: 'Crates',
    desc: 'The Rust crate',
  },
  {
    href: 'https://www.npmjs.com/package/tuono',
    label: 'npm',
    desc: 'The npm package',
  },
]

function NavCard({ href, label, desc }: NavLink): JSX.Element {
  const body = (
    <>
      <span className="nav-card__title">
        {label}
        <span className="nav-card__arrow" aria-hidden>
          →
        </span>
      </span>
      <span className="nav-card__desc">{desc}</span>
    </>
  )

  return (
    <a className="nav-card" href={href} target="_blank" rel="noreferrer">
      {body}
    </a>
  );
}

const IndexPage: TuonoPage<'/'> = ({ subtitle }) => {
  return (
    <>
      <img src="/lightning.webp" className="background" />
      <div className="hero">
        <h1 className="title">
          <span>TU</span>
          {/* The logo stands in for the "O" visually; keep a hidden "O" so the
              heading still reads "TUONO" to screen readers, and hide the SVG. */}
          <span className="visually-hidden">O</span>
          <Wordmark aria-hidden />
          <span>NO</span>
        </h1>
        <p className="subtitle">{subtitle}</p>
      </div>

      <nav className="nav-grid">
        {LINKS.map((link) => (
          <NavCard key={link.href} {...link} />
        ))}
      </nav>
    </>
  )
}

export default IndexPage
