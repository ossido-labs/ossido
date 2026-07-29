import type { TuonoPage } from 'tuono/types'

const AboutPage: TuonoPage<'/about'> = ({ heading }) => {
  return <p data-testid="about">{heading}</p>
}

export default AboutPage
