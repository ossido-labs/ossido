import type {
  OssidoConfig,
  OssidoConfigServer,
  OssidoConfigOutput,
  OssidoLogFormat,
  OssidoLogLevel,
} from '../config';

/** Fully-resolved logging config (defaults filled) written to `config.json`. */
export interface InternalOssidoConfigLogging {
  format: OssidoLogFormat;
  routeTree: boolean;
  browser: {
    enabled: boolean;
    level: OssidoLogLevel;
  };
}

/** Fully-resolved dev config (defaults filled). */
export interface InternalOssidoConfigDev {
  criticalCss: boolean;
}

/**
 * Fully-resolved SSR config. `renderThreads` is `null` when unset — the Rust
 * runtime then defaults it to the machine's available parallelism.
 */
export interface InternalOssidoConfigSsr {
  renderThreads: number | null;
}

export interface InternalOssidoConfig extends Omit<
  OssidoConfig,
  'server' | 'logging' | 'dev' | 'ssr' | 'output' | 'viewTransitions' | 'env'
> {
  server: OssidoConfigServer;
  logging: InternalOssidoConfigLogging;
  dev: InternalOssidoConfigDev;
  ssr: InternalOssidoConfigSsr;
  output: OssidoConfigOutput;
  viewTransitions: boolean;
  /** Normalized to an array (a single configured path is wrapped). */
  env?: Array<string>;
}
