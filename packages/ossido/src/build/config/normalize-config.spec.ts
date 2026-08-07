import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import type { OssidoConfig } from '../../config'

import { normalizeConfig } from './normalize-config'

const PROCESS_CWD_MOCK = 'PROCESS_CWD_MOCK'

vi.spyOn(process, 'cwd').mockReturnValue(PROCESS_CWD_MOCK)

describe('normalizeConfig', () => {
  it('should empty base config if empty config is provided', () => {
    const config: OssidoConfig = {}

    expect(normalizeConfig(config)).toStrictEqual({
      server: {
        host: 'localhost',
        origin: null,
        port: 3000,
      },
      vite: {
        alias: undefined,
        css: undefined,
        optimizeDeps: undefined,
        plugins: [],
      },
      logging: {
        format: 'pretty',
        routeTree: false,
        browser: { enabled: true, level: 'info' },
      },
      dev: { criticalCss: true },
      ssr: { renderThreads: null },
      output: 'server',
    })
  })

  it('should return an empty config if invalid values are provided', () => {
    // @ts-expect-error testing invalid config
    expect(normalizeConfig({ invalid: true })).toStrictEqual({
      server: {
        host: 'localhost',
        origin: null,
        port: 3000,
      },
      vite: {
        alias: undefined,
        css: undefined,
        optimizeDeps: undefined,
        plugins: [],
      },
      logging: {
        format: 'pretty',
        routeTree: false,
        browser: { enabled: true, level: 'info' },
      },
      dev: { criticalCss: true },
      ssr: { renderThreads: null },
      output: 'server',
    })
  })

  describe('server', () => {
    it('should assign the host and port defined by the user', () => {
      const config: OssidoConfig = {
        server: { host: '0.0.0.0', port: 8080 },
      }

      expect(normalizeConfig(config)).toStrictEqual(
        expect.objectContaining({
          server: expect.objectContaining({
            host: '0.0.0.0',
            port: 8080,
          }) as unknown,
        }),
      )
    })
  })

  describe('server - origin', () => {
    it('should assign the origin defined by the user', () => {
      const config: OssidoConfig = {
        server: {
          host: '0.0.0.0',
          origin: 'https://ossido.localhost',
          port: 8080,
        },
      }

      expect(normalizeConfig(config)).toStrictEqual(
        expect.objectContaining({
          server: expect.objectContaining({
            host: '0.0.0.0',
            origin: 'https://ossido.localhost',
            port: 8080,
          }) as unknown,
        }),
      )
    })
  })

  describe('vite - alias', () => {
    it('should not modify alias pointing to packages', () => {
      const libraryName = '@tabler/icons-react'
      const libraryAlias = '@tabler/icons-react/dist/esm/icons/index.mjs'
      const config: OssidoConfig = {
        vite: { alias: { [libraryName]: libraryAlias } },
      }

      expect(normalizeConfig(config)).toStrictEqual(
        expect.objectContaining({
          vite: expect.objectContaining({
            alias: {
              '@tabler/icons-react':
                '@tabler/icons-react/dist/esm/icons/index.mjs',
            },
          }) as unknown,
        }),
      )
    })

    it('should transform relative paths to absolute path relative to process.cwd()', () => {
      const config: OssidoConfig = {
        vite: { alias: { '@': './src', '@no-prefix': 'src' } },
      }

      expect(normalizeConfig(config)).toStrictEqual(
        expect.objectContaining({
          vite: expect.objectContaining({
            alias: {
              '@': path.join(PROCESS_CWD_MOCK, 'src'),
              '@no-prefix': path.join(PROCESS_CWD_MOCK, 'src'),
            },
          }) as unknown,
        }),
      )
    })

    it('should not transform alias with absolute path', () => {
      const config: OssidoConfig = {
        vite: { alias: { '@1': '/src/pippo', '@2': 'file://pluto' } },
      }

      expect(normalizeConfig(config)).toStrictEqual(
        expect.objectContaining({
          vite: expect.objectContaining({
            alias: {
              '@1': '/src/pippo',
              '@2': 'file://pluto',
            },
          }) as unknown,
        }),
      )
    })

    it('should apply previous behavior when using alias as list', () => {
      const config: OssidoConfig = {
        vite: {
          alias: [
            { find: '1', replacement: '@tabler/icons-react-fun' },
            { find: '2', replacement: './src' },
            { find: '3', replacement: 'file://pluto' },
          ],
        },
      }

      expect(normalizeConfig(config)).toStrictEqual(
        expect.objectContaining({
          vite: expect.objectContaining({
            alias: [
              { find: '1', replacement: '@tabler/icons-react-fun' },
              { find: '2', replacement: path.join(PROCESS_CWD_MOCK, 'src') },
              { find: '3', replacement: 'file://pluto' },
            ],
          }) as unknown,
        }),
      )
    })
  })

  describe('dev', () => {
    it('should default criticalCss to true', () => {
      expect(normalizeConfig({})).toStrictEqual(
        expect.objectContaining({
          dev: { criticalCss: true },
        }),
      )
    })

    it('should honour criticalCss set to false', () => {
      const config: OssidoConfig = { dev: { criticalCss: false } }

      expect(normalizeConfig(config)).toStrictEqual(
        expect.objectContaining({
          dev: { criticalCss: false },
        }),
      )
    })
  })

  describe('ssr', () => {
    it('should default renderThreads to null (auto)', () => {
      expect(normalizeConfig({})).toStrictEqual(
        expect.objectContaining({
          ssr: { renderThreads: null },
        }),
      )
    })

    it('should honour renderThreads set by the user', () => {
      const config: OssidoConfig = { ssr: { renderThreads: 4 } }

      expect(normalizeConfig(config)).toStrictEqual(
        expect.objectContaining({
          ssr: { renderThreads: 4 },
        }),
      )
    })
  })

  describe('output', () => {
    it('should default output to server', () => {
      expect(normalizeConfig({})).toStrictEqual(
        expect.objectContaining({ output: 'server' }),
      )
    })

    it('should honour output set to static', () => {
      const config: OssidoConfig = { output: 'static' }

      expect(normalizeConfig(config)).toStrictEqual(
        expect.objectContaining({ output: 'static' }),
      )
    })
  })

  describe('vite - css config', () => {
    it('should have css undefined if not provided', () => {
      const config: OssidoConfig = {}

      expect(normalizeConfig(config).vite).toHaveProperty('css', undefined)
    })

    it('should preserve the css configuration as provided by the user', () => {
      const cssConfig = {
        preprocessorOptions: {
          scss: { additionalData: '$color: red;' },
        },
      }
      const config: OssidoConfig = {
        vite: { css: cssConfig },
      }

      expect(normalizeConfig(config)).toStrictEqual(
        expect.objectContaining({
          vite: expect.objectContaining({
            css: cssConfig,
          }) as unknown,
        }),
      )
    })
  })
})
