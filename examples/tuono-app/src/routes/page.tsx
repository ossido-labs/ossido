import type { TuonoPage } from 'tuono/types'

// Props are typed automatically from the `/` route's Rust handler return type.
const IndexPage: TuonoPage<'/'> = ({ subtitle }) => {
  return (
    <>
      <div className="title-wrap">
        <h1 className="title">
          TU<span>O</span>NO
        </h1>
        <div className="logo">
          <img src="rust.svg" className="rust" />
          <img src="react.svg" className="react" />
        </div>
      </div>
      <div className="subtitle-wrap">
        <p className="subtitle">{subtitle}</p>
        <a
          href="https://github.com/tuono-labs/tuono"
          target="_blank"
          className="button"
          type="button"
        >
          Github
        </a>
      </div>
    </>
  )
}

export default IndexPage
