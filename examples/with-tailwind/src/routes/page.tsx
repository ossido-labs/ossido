import type { JSX } from 'react'
import type { OssidoPage } from 'ossido/types'

import { Wordmark } from '../components/Wordmark.tsx'

interface NavLink {
  href: string
  label: string
  desc: string
}

const LINKS: ReadonlyArray<NavLink> = [
  {
    href: 'https://github.com/ChildishForces/ossido',
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
]

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
  )
}

const IndexPage: OssidoPage<'/'> = ({ subtitle }) => {
  return (
    <>
      <img
        src="/lightning.webp"
        alt=""
        className="fixed inset-0 -z-10 h-full w-full object-cover object-center opacity-20 mix-blend-screen"
      />

      <div className="flex flex-col items-center gap-3.5 text-center">
        <h1 className="flex select-none items-center justify-center text-[clamp(95px,13vw,150px)] font-extrabold leading-none tracking-[0.02em] text-white">
          <span>TU</span>
          {/* The logo stands in for the "O" visually; keep a hidden "O" so the
              heading still reads "OSSIDO" to screen readers, and hide the SVG. */}
          <span className="sr-only">O</span>
          <Wordmark aria-hidden />
          <span>NO</span>
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
  )
}

export default IndexPage
