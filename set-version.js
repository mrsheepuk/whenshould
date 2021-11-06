const { readFileSync, writeFileSync } = require('fs')
const f = readFileSync('./public/version.dat', 'ascii').trim()
writeFileSync('src/version.ts', `export const VERSION = "${f}"`)