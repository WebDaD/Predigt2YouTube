var config = require('./config.json')
const p2y = require('./libs/p2y.js')
if (process.argv.length < 3) {
  console.error('Please add URL as argument')
  process.exit(1)
} else {
  config.url = process.argv[2]
}
if (process.argv.length === 3 && process.argv[2] === 'rawimage') {
  config.rawimage = true
} else {
  config.rawimage = false
}
p2y.createVideo(config, function (error, response) {
  if (error) {
    console.error(error)
  } else {
    console.log(response)
  }
})
