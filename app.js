// TODO: nice messages
// TODO: errors
var url = '' // http://www.feg-ffb.de/2017/05/01/liebe-ist-das-thema/
if (process.argv.length !== 3) {
  console.error('Please add URL as argument')
  process.exit(1)
} else {
  url = process.argv[2]
}

var cheerio = require('cheerio')
var request = require('request')
var fs = require('fs')
var download = require('download')
var data = {}
request(url, function (error, response, body) {
  if (error) {
    console.error('error:', error)
    process.exit(1)
  } else {
    var $ = cheerio.load(body)

    // Get Data
    data.title = $('dd.topic').text()
    data.prediger = $('dd.prediger').text()
    data.series = $('dd.series a').text()
    data.date = $('dd.date').text()
    data.length = $('dd.length').text()
    data.bible = $('dd.bible').text()
    data.bible_text = $('div.entry-container > div > p:nth-child(7)').text()
    data.predigt_text = $('div.entry-container > div > p:nth-child(9)').text()
    data.image = $('div.entry-img > img').attr('data-large-file')
    data.prediger_image = $('.entry-content > .row > div:nth-child(2) > figure > a > img').attr('data-large-file')
    data.mp3 = $('div.entry-container > div > p.powerpress_links.powerpress_links_mp3 > a.powerpress_link_pinw').attr('href')

    // Download Images and mp3
    download(data.image).then(data => {
      fs.writeFileSync('tmp/image.jpg', data)
    })
    download(data.prediger_image).then(data => {
      fs.writeFileSync('tmp/prediger.jpg', data)
    })
    download(data.mp3).then(data => {
      fs.writeFileSync('tmp/predigt.mp3', data)
    })

    // TODO: Create Front-Image using data and imagemagick (width-org:750, width:targ:720)

    // TODO: create movie using Front-Image and mp3 https://superuser.com/questions/1041816/combine-one-image-one-audio-file-to-make-one-video-using-ffmpeg

    // TODO: Add VOrspann, Abspann https://wiki.ubuntuusers.de/transcode/#Videos-anhaengen

    // TODO: upload to youtube https://github.com/IonicaBizau/youtube-api/blob/master/README.md

    // TODO: cleanup tmp folder
  }
})
