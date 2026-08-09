import type { JSX } from 'react';
import type { OssidoPage } from '@ossido-labs/ossido/types';

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
  return (
    <a
      className="group flex flex-col gap-1.5 rounded-[14px] border border-white/10 bg-white/[0.02] px-[22px] py-5 no-underline transition duration-200 hover:-translate-y-0.5 hover:border-ossido-cyan/55 hover:bg-ossido-cyan/6"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      <span className="flex items-center justify-between text-lg font-semibold text-white">
        {label}
        <span
          className="opacity-50 transition duration-200 group-hover:translate-x-1 group-hover:opacity-100"
          aria-hidden
        >
          →
        </span>
      </span>
      <span className="text-sm font-light text-ossido-text-dim">{desc}</span>
    </a>
  );
}

const IndexPage: OssidoPage<'/'> = ({ subtitle }) => {
  return (
    <>
      <div className="flex flex-col items-center gap-12 text-center">
        <h1 className="flex select-none items-center justify-center leading-none">
          <Wordmark aria-hidden />
        </h1>
        <p className="max-w-[32ch] text-[clamp(16px,2.3vw,23px)] font-light text-ossido-text-dim">
          {subtitle}
        </p>
      </div>

      <nav className="grid w-full max-w-[780px] grid-cols-1 gap-4 sm:grid-cols-3">
        {LINKS.map((link) => (
          <NavCard key={link.href} {...link} />
        ))}
      </nav>
    </>
  );
};

export default IndexPage;
