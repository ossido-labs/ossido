import { JSX } from 'react'

interface TestProps {
  timestamp: number
}

export default function TestPage({ timestamp }: TestProps): JSX.Element {
  console.info(timestamp);
  return (
    <p>
      Test... <span suppressHydrationWarning>{timestamp}</span>
    </p>
  )
}
