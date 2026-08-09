import type { JSX } from 'react';

import styles from './PokemonView.module.css';

export default function PokemonSkeleton(): JSX.Element {
  return (
    <div className={styles.pokemon} style={{ height: 270 }}>
      <div>
        <h1 className={styles.name}>Loading...</h1>
        <dl className={styles.spec}>
          <dt className={styles.label}>Weight: </dt>
          <dd>...lbs</dd>
        </dl>
        <dl className={styles.spec}>
          <dt className={styles.label}>Height: </dt>
          <dd>...ft</dd>
        </dl>
      </div>
    </div>
  );
}
