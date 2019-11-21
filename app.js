var program = require('commander')
var config = require('./config.json')
const p2y = require('./libs/p2y.js')

program
  .version('1.0.1')
  .usage('[options] <url>')
  .option('-d, --debug', 'Debug Mode')
  .option('-r, --rawimage', 'Rawimage Mode')
  .parse(process.argv)

if (!program.args.length) {
  program.help()
  process.exit(1)
}

if (!program.args.length === 1) {
  program.help()
  process.exit(1)
} else {
  config.rawimage = program.rawimage
  config.debug = program.debug
  config.url = program.args[0]
}

console.log('Using URL: ' + config.url)

p2y.createVideo(config, function (error, response) {
  if (error) {
    console.error(error)
  } else {
    console.log(response)
  }
})
