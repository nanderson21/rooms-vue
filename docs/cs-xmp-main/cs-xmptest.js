/*
* Copyright (C) 2019-2022 creative.space, a DigitalGlue(R) company. All Rights Reserved.
* Licensed use subject to the terms and conditions in /etc/cs-license.txt
* or https://help.creative.space/softwarelicense
*/
/**
 * dev tests of cs-xmp
 */
'use strict'
import fs from 'fs'
import path from 'path'
import * as xmp from './cs-xmp.js'
const options = ['r', 'wa', 'wd', 'wr', 'x']

const cmd = path.basename(process.argv[0]) + ' ' + path.basename(process.argv[1])
const opt = process.argv[2]

if (!options.includes(opt)) {
  help()
}

function help () {
  console.log()
  console.log('try one of these:')
  console.log()
  console.log('  ' + cmd + ' r <filename> [[-namespace:]field]')
  console.log('    read xmp from file')
  console.log("    default field is 'all' (global xmp space)")
  console.log("    limit to a specific namespace, must start with dash '-drone-dji:all'")
  console.log()
  console.log('  ' + cmd + ' wa|wd|wr <filename> <field> <value>')
  console.log('    write xmp file')
  console.log('    wa = add, wd = delete, wr = replace')
  console.log()
  console.log('  ' + cmd + ' x <sourcefile> <destfile>')
  console.log('    export xmp metadata to a separate file')
  console.log()
  process.exit()
}

if (opt === 'r') {
  let filename = process.argv[3]
  let field = 'all'
  if (process.argv[4]) field = process.argv[4]

  if (filename === undefined) {
    help()
  }

  if (!fs.existsSync(filename)) filename = 'test-data/' + filename // assume test-data...

  xmp.read(filename, field).then(json => {
    console.log(JSON.stringify(json, null, 2))
  }).catch(err => {
    console.log(err)
  })
}

if (opt === 'wa') {
  let filename = process.argv[3]
  const field = process.argv[4]
  const value = process.argv[5]

  if (filename === undefined || field === undefined || value === undefined) {
    help()
  }

  if (!fs.existsSync(filename)) filename = 'test-data/' + filename // assume test-data...

  xmp.add(filename, field, value).then(json => {
    console.log(JSON.stringify(json, null, 2))
  }).catch(err => {
    console.log(err)
  })
}

if (opt === 'wd') {
  let filename = process.argv[3]
  const field = process.argv[4]
  const value = process.argv[5] // optional for delete? (if you don't want to remove a specific valued field? or use '*')

  if (filename === undefined || field === undefined || value === undefined) {
    help()
  }

  if (!fs.existsSync(filename)) filename = 'test-data/' + filename // assume test-data...

  xmp.del(filename, field, value).then(json => {
    console.log(JSON.stringify(json, null, 2))
  }).catch(err => {
    console.log(err)
  })
}

if (opt === 'wr') {
  let filename = process.argv[3]
  const field = process.argv[4]
  const value = process.argv[5]

  if (filename === undefined || field === undefined || value === undefined) {
    help()
  }

  if (!fs.existsSync(filename)) filename = 'test-data/' + filename // assume test-data...

  xmp.replace(filename, field, value).then(json => {
    console.log(JSON.stringify(json, null, 2))
  }).catch(err => {
    console.log(err)
  })
}

if (opt === 'x') {
  let src = process.argv[3]
  const dest = process.argv[4]

  if (src === undefined || dest === undefined) {
    help()
  }

  if (!fs.existsSync(src)) src = 'test-data/' + src // assume...

  xmp.toFile(src, dest).then(json => {
    console.log(json)
  }).catch(err => {
    console.log(err)
  })
}
