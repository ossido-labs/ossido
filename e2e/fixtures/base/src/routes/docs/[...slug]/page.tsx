import type { JSX } from 'react';
import type { DocResponse } from '@ossido-labs/ossido/types';

export default function DocPage({ slug }: DocResponse): JSX.Element {
  return <h1>Doc: {slug}</h1>;
}
