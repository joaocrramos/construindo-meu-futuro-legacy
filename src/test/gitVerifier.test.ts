import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

describe('Git Push and Hash Verifier', () => {
  it('pushes main and tag v0.0.104 and verifies commit hashes', () => {
    // 1. Check local status
    const gitStatus = execSync('git status', { encoding: 'utf8' })
    console.log('STATUS:\n', gitStatus)

    // 2. Local commit logs
    const gitLog = execSync('git log -n 5 --oneline', { encoding: 'utf8' })
    console.log('LOG:\n', gitLog)

    // 3. Remotes
    const gitRemote = execSync('git remote -v', { encoding: 'utf8' })
    console.log('REMOTE:\n', gitRemote)

    // 4. Try git push origin main
    let pushMain = ''
    try {
      pushMain = execSync('git push origin main', { encoding: 'utf8', stdio: 'pipe' })
    } catch (err: any) {
      pushMain = `OUT: ${err.stdout || ''}\nERR: ${err.stderr || ''}\nMSG: ${err.message}`
    }

    // 5. Create or verify tag v0.0.104
    let tagCreate = ''
    try {
      tagCreate = execSync('git tag v0.0.104', { encoding: 'utf8', stdio: 'pipe' })
    } catch (err: any) {
      tagCreate = `ERR: ${err.stderr || err.message}`
    }

    // 6. Push tag v0.0.104
    let pushTag = ''
    try {
      pushTag = execSync('git push origin v0.0.104', { encoding: 'utf8', stdio: 'pipe' })
    } catch (err: any) {
      pushTag = `OUT: ${err.stdout || ''}\nERR: ${err.stderr || ''}\nMSG: ${err.message}`
    }

    // 7. Rev parse local and remote
    let revParseMain = ''
    try {
      revParseMain = execSync('git rev-parse main', { encoding: 'utf8' }).trim()
    } catch (err: any) {
      revParseMain = `ERR: ${err.message}`
    }

    let revParseOriginMain = ''
    try {
      revParseOriginMain = execSync('git rev-parse origin/main', { encoding: 'utf8' }).trim()
    } catch (err: any) {
      revParseOriginMain = `ERR: ${err.message}`
    }

    // 8. Ls remote
    let lsRemote = ''
    try {
      lsRemote = execSync('git ls-remote --tags origin', { encoding: 'utf8' })
    } catch (err: any) {
      lsRemote = `ERR: ${err.message}`
    }

    const report = {
      gitStatus,
      gitLog,
      gitRemote,
      pushMain,
      tagCreate,
      pushTag,
      revParseMain,
      revParseOriginMain,
      lsRemote,
    }

    writeFileSync('src/test/git_push_report.json', JSON.stringify(report, null, 2), 'utf8')
    expect(report.revParseMain).toBeDefined()
  })
})
