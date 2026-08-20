import type { JSX } from 'react';
import type { OssidoPage } from '@ossido-labs/ossido/types';
import { getEnv } from '@ossido-labs/ossido/env';

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
    href: 'https://www.npmjs.com/package/@ossido-labs/ossido',
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
  // Public env var, typed from the `#[ossido::Environment]` struct and injected
  // into the SSR global.
  const apiUrl = getEnv('api_url');
  // `analytics_enabled` is `boolean | null`; the fallback collapses it to `boolean`.
  const analytics = getEnv('analytics_enabled', false);

  return (
    <>
      <div className="hero">
        <h1 className="title">
          <Wordmark aria-hidden />
        </h1>
        <p className="subtitle">{subtitle}</p>
        <p className="subtitle" data-testid="api-url">
          API: {apiUrl} · analytics: {String(analytics)}
        </p>
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
