import React from 'react'

interface IndexProps {
  subtitle: string
}

export default function IndexPage({ subtitle }: IndexProps): React.ReactNode {
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
