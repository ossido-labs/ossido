import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { listFilesRecursive } from './utils'

describe('listFilesRecursive', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ossido-manifest-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('lists every file as a posix path relative to the root', () => {
    writeFileSync(join(dir, 'index.html'), '')
    mkdirSync(join(dir, 'about'))
    writeFileSync(join(dir, 'about', 'index.html'), '')
    mkdirSync(join(dir, 'assets'))
    writeFileSync(join(dir, 'assets', 'app.js'), '')

    expect(listFilesRecursive(dir).sort()).toEqual([
      'about/index.html',
      'assets/app.js',
      'index.html',
    ])
  })

  it('returns an empty list for a missing directory', () => {
    expect(listFilesRecursive(join(dir, 'does-not-exist'))).toEqual([])
  })
})
