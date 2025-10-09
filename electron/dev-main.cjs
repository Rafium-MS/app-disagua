require('tsx/cjs')

const { join } = require('node:path')
const { pathToFileURL } = require('node:url')

async function start() {
  try {
    const target = pathToFileURL(join(__dirname, 'main.ts')).href
    await import(target)
  } catch (error) {
    console.error('Failed to start Electron main process via tsx:', error)
    process.exitCode = 1
  }
}

void start()
