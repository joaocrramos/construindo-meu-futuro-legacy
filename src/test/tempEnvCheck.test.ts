import { describe, it } from 'vitest'

describe('Admin Provision Tool', () => {
  it('checks env', () => {
    console.log(
      'ENV KEYS:',
      Object.keys(process.env).filter(
        (k) =>
          k.includes('PB') ||
          k.includes('POCKET') ||
          k.includes('SUPER') ||
          k.includes('TOKEN') ||
          k.includes('SKIP') ||
          k.includes('URL'),
      ),
    )
  })
})
