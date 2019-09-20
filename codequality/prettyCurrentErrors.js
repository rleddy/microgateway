/* eslint-disable no-multiple-empty-lines */

const { spawn } = require('child_process')
const { promisify } = require('util')
const fs = require('fs')
const colors = require('colors')


var prevQTag = process.argv[2]
if ( prevQTag === undefined ) {
    console.log("tag parameter must be supplied")
    process.exit(1)
}


var gPrevQualMap = JSON.parse(fs.readFileSync('prevCount.json','ascii').toString())

var summary = {}
var etotal = 0
for ( var k in gPrevQualMap ) {
    //
    var qdat = gPrevQualMap[k];
    if ( qdat.in_summary ) {
        summary[k] = qdat.error_count
        etotal += qdat.error_count
    }
}


console.log(colors.bold.yellow("SUMMARY OF QUALITY ERRORS:"))
console.dir(summary)
console.log(colors.bold("Total: ")  + etotal)
