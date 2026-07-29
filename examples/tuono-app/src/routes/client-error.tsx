class TestClientError extends Error {}

export default function () {
  throw new TestClientError('This is a client error!');

  return <p>Test client error</p>;
}