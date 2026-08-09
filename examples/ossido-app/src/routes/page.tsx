import type { JSX } from 'react';
import type { OssidoPage } from 'ossido/types';

import { Wordmark } from '../components/Wordmark.tsx';

interface NavLink {
  href: string;
  label: string;
  desc: string;
}

const LINKS: ReadonlyArray<NavLink> = [
  {
    href: 'https://github.com/ossido-labs/ossido',
    label: 'GitHub',
    desc: 'Star the repo',
  },
  {
    href: 'https://crates.io/crates/ossido',
    label: 'Crates',
    desc: 'The Rust crate',
  },
  {
    href: 'https://www.npmjs.com/package/ossido',
    label: 'npm',
    desc: 'The npm package',
  },
];

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
  );

  return (
    <a className="nav-card" href={href} target="_blank" rel="noreferrer">
      {body}
    </a>
  );
}

const IndexPage: OssidoPage<'/'> = ({ subtitle }) => {
  return (
    <>
      <img src="/lightning.webp" className="background" />
      <div className="hero">
        <h1 className="title">
          <span>TU</span>
          {/* The logo stands in for the "O" visually; keep a hidden "O" so the
              heading still reads "OSSIDO" to screen readers, and hide the SVG. */}
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
  );
};

export default IndexPage;
