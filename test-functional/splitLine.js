

const fs = require('fs')

var nargs = process.argv.length - 1
var fpos = 2


if ( nargs > 2 && ( (nargs % 2) === 1) ) {
    //
    var fileName = process.argv[fpos]
    var splitkey = process.argv[fpos+1]

    var infoFile = fs.readFileSync(fileName,'ascii').toString()

    var lines = infoFile.split('\n')
    lines = lines.filter(line => {
        return(line.indexOf(splitkey) > 0)
    })

    var datline = lines[0]
    datline = datline.split(splitkey)

    var output = datline[1].trim()

    console.log(output);
}
