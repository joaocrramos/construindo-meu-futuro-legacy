import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

console.log('--- GIT PROBE START ---')
try {
  const status = execSync('git status', { encoding: 'utf8' })
  console.log('GIT STATUS:\n', status)

  const remote = execSync('git remote -v', { encoding: 'utf8' })
  console.log('GIT REMOTE:\n', remote)

  const log = execSync('git log -n 5 --oneline', { encoding: 'utf8' })
  console.log('GIT LOG:\n', log)

  writeFileSync('git_info.txt', `STATUS:\n${status}\nREMOTE:\n${remote}\nLOG:\n${log}`, 'utf8')
} catch (e) {
  console.error('PROBE ERROR:', e.message)
}
console.log('--- GIT PROBE END ---')
process.exit(1)
