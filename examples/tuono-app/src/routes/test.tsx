import type { TuonoRouteProps } from 'tuono'

export default function ({
  data,
  isLoading,
}: TuonoRouteProps<{ timestamp: number }>) {
  if (isLoading) return <p>Loading...</p>
  return (
    <p>
      Test... <span suppressHydrationWarning>{data?.timestamp}</span>
    </p>
  )
}
