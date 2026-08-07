export default function ErrorPage({ error }: { error: Error }) {
  return <p>{error.message}</p>
}
