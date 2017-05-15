var hostname = 'http://feg-ffb.de'
var url = '' // 2017/05/01/liebe-ist-das-thema/
if (process.argv.length !== 3) {
  console.error('Please add URL as argument')
} else {
  url = process.argv[2]
}

var cheerio = require('cheerio')
var http = require('http')
var options = {hostname: hostname, port: 80, path: url, method: 'GET'}
var data = {}
var req = http.request(options, function (res) {
  res.setEncoding('utf-8')
  res.on('data', function (chunk) {
    var $ = cheerio.load(chunk)
    data.title = $('dd.topic').text()
    console.log(data)
  })
})
req.end()
