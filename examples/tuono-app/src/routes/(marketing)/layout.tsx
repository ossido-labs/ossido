import type { TuonoLayout } from 'tuono/types'

// `banner` is inferred from the `(marketing)/layout.rs` handler; `children` is
// provided by `TuonoLayout`.
const MarketingLayout: TuonoLayout<'/(marketing)'> = ({ children, banner }) => {
  return (
    <div data-testid="marketing-layout">
      <p>Marketing group layout</p>
      {banner ? <p data-testid="marketing-banner">{banner}</p> : null}
      {children}
    </div>
  )
}

export default MarketingLayout
