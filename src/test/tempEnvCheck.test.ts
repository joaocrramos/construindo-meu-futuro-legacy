import { describe, it } from 'vitest'

describe('Admin Provision Tool', () => {
  it('checks env', () => {
    const keys = Object.keys(process.env).filter(
      (k) =>
        k.includes('PB') ||
        k.includes('POCKET') ||
        k.includes('SUPER') ||
        k.includes('TOKEN') ||
        k.includes('SKIP') ||
        k.includes('URL'),
    )
    console.log('ENV KEYS:', keys)
  })
})
