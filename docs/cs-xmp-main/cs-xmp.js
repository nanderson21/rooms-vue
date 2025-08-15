/*
* Copyright (C) 2019-2022 creative.space, a DigitalGlue(R) company. All Rights Reserved.
* Licensed use subject to the terms and conditions in /etc/cs-license.txt
* or https://help.creative.space/softwarelicense
*/
/**
 * cs-xmp.js - a wrapper for the exiftool.org perl metadata tools
 */
'use strict'
// import fs from 'fs'
// import path from 'path'
// import SysDebugFactory from 'cs-sysdebug'
import { exec } from 'child_process'
import { escapePath } from 'cs-escapepath'
import readline from 'readline'
// const packagetext = fs.readFileSync(path.resolve('package.json'))
// const packagejson = JSON.parse(packagetext)
// const version = packagejson.version
// SysDebug more trouble than it is worth for this test
// const SysDebugClass = SysDebugFactory()
// const SysDebug = new SysDebugClass()
// SysDebug.log('Debug', { function: 'cs-xmp', message: 'cs-xmp version: ' + version + ' loaded' })

const writeTypes = {
  ADD: 'add',
  DEL: 'del',
  REPLACE: 'replace'
}

function mkrval (funcname) {
  return { status: '', message: '', function: 'cs-xmp.' + funcname, args: [], data: {}, exitcode: 0 }
}

/**
 *
 * @param {*} filename
 * @param {*} field optional default all. you can also use namespace, must start with dash: e.g. '-drone-dgi:RelativeAltitude'
 */
export function read (filename, field = ':all') {
  return new Promise((resolve, reject) => {
    const rval = mkrval('read')
    rval.args.push(filename)
    rval.args.push(field)

    let arg = field
    // todo need more checks
    if (field.indexOf(':') < 0) {
      arg = ':' + field
    }

    // '-struct -j' for JSON format
    const proc = exec('exiftool -config csXMP.config -api largefilesupport -struct -j -xmp' + arg + ' ' + escapePath(filename), (error) => {
      if (error) {
        rval.status = 'Error'
        rval.message = error.message
        return reject(rval)
      }
    })

    // let ln = 1;
    let jsonstr = ''
    readline.createInterface({
      input: proc.stdout,
      terminal: false
    }).on('line', line => {
      // console.log(ln++ + ': ' + line);

      /**
             * the exiftool output comes on separate lines like, these 6 lines:
               [{
                    "XMPToolkit": "Adobe XMP Core 5.6-c067 79.157747, 2015/03/30-23:40:42        ",
                    "CreatorTool": "Adobe Photoshop CC 2017 (Macintosh)",
                    "CreateDate": "2020:02:05 10:16:02-08:00",
                    "DocumentID": "A1EACEBA64856B3F767743D5122D953F"
               }]
             */
      jsonstr += line
    })

    proc.on('close', (code, signal) => {
      rval.exitcode = code
      if (code === 0) {
        try {
          rval.data = JSON.parse(jsonstr)
        } catch (e) {
          console.log('cs-xmp.get ex:' + e)
          rval.status = 'Error'
          rval.message = e.message
          return reject(rval)
        }
        rval.status = 'Ok'
        return resolve(rval)
      }
      // else let exec error or stderr reject
    })

    // assuming stderr has a better error message than just 'non-zero exit code'
    proc.stderr.on('data', data => {
      rval.status = 'Error'
      rval.message = data
      return reject(rval)
    })
  })
} // read

export function add (filename, field, value) {
  return write(writeTypes.ADD, filename, field, value)
}

export function del (filename, field, value) {
  return write(writeTypes.DEL, filename, field, value)
}

export function replace (filename, field, value) {
  return write(writeTypes.REPLACE, filename, field, value)
}

export function write (writeType, filename, field, value) {
  return new Promise((resolve, reject) => {
    const rval = mkrval(writeType)
    rval.args.push(filename)
    rval.args.push(field)
    rval.args.push(value)

    let operator = '='
    switch (writeType) {
      case writeTypes.ADD:
        operator = '+='
        break
      case writeTypes.DEL:
        operator = '-='
        break
      case writeTypes.REPLACE: // same as add, if tag doesn't exist
        operator = '='
        break
      default:
        rval.status = 'Error'
        rval.message = 'undefined: '
        return reject(rval)
    }

    if (filename === undefined || field === undefined || value === undefined) {
      rval.status = 'Error'
      rval.message = 'some parameters are missing'
      return reject(rval)
    }

    if (!field.startsWith('-')) {
      field = '-' + field
    }

    // exiftool -FieldFoo="value" file.xyz
    // console.log('exiftool ' + field + operator + '"' + value + '" ' + escapePath(filename));
    const proc = exec('exiftool -config csXMP.config -api largefilesupport ' + field + operator + '"' + value + '" ' + escapePath(filename), (error) => {
      if (error) {
        rval.status = 'Error'
        rval.message = error.message
        return reject(rval)
      }
    })

    // let hint = ' created';

    rval.data.output = []
    readline.createInterface({
      input: proc.stdout,
      terminal: false
    }).on('line', line => {
      rval.data.output.push(line.replace(/\r?\n/, '')) // mostly for debug, probably something boring like '1 image files created'
      // if (line.includes('updated')) hint = ' updated';
    })

    proc.on('close', (code, signal) => {
      rval.exitcode = code
      if (code === 0) {
        rval.status = 'Ok'
        // rval.message = destfile + hint; // we assume...
        rval.message = filename + ' updated' // we assume...
        return resolve(rval)
      }
      // else let exec error or stderr reject
    })

    // assuming stderr has a better error message than just 'non-zero exit code'
    proc.stderr.on('data', data => {
      rval.status = 'Error'
      rval.message = data.replace(/\r?\n/, '')
      return reject(rval)
    })
  })
} // write

/**
 * export all xmp metadata to a new file
 * @param {*} sourcefile
 * @param {*} destfile extension must be '.xmp' - or an empty file that exists ('touch out.tmp')
 *
 * Note if destfile exists it will be 'updated' and orig saved: out.xmp_original
 * Bonus - if the dest file exists, it does a sanity check:
 * message: 'Error: Not a valid XMP (looks more like a TXT) - out.xmp\n'
 *
 * if not .xmp:
 * message: 'Error: File not found - out.foo'
 * but if it exits and is xmp or empty, it works:
 * message: 'out.tmp updated'
 */
export function toFile (sourcefile, destfile) {
  return new Promise((resolve, reject) => {
    const rval = mkrval('toFile')
    rval.args.push(sourcefile)
    rval.args.push(destfile)

    const proc = exec('exiftool -config csXMP.config -api largefilesupport -tagsfromfile ' + escapePath(sourcefile) + ' -xmp:all ' + escapePath(destfile), (error) => {
      if (error) {
        rval.status = 'Error'
        rval.message = error.message
        return reject(rval)
      }
    })

    let hint = ' created'

    rval.data.output = []
    readline.createInterface({
      input: proc.stdout,
      terminal: false
    }).on('line', line => {
      rval.data.output.push(line.replace(/\r?\n/, '')) // mostly for debug, probably something boring like '1 image files created'
      if (line.includes('updated')) hint = ' updated'
    })

    proc.on('close', (code, signal) => {
      rval.exitcode = code
      if (code === 0) {
        rval.status = 'Ok'
        rval.message = destfile + hint // we assume...
        return resolve(rval)
      }
      // else let exec error or stderr reject
    })

    // assuming stderr has a better error message than just 'non-zero exit code'
    proc.stderr.on('data', data => {
      rval.status = 'Error'
      rval.message = data.replace(/\r?\n/, '')
      return reject(rval)
    })
  })
} // toFile
