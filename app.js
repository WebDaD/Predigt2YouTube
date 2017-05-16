// TODO: nice messages
// TODO: errors
// TODO: colors to output
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
var gm = require('gm')
var imageMagick = gm.subClass({imageMagick: true})
var execSync = require('child_process').execSync
var data = {}
request(url, function (error, response, body) {
  if (error) {
    console.error('error:', error)
    process.exit(2)
  } else {
    var $ = cheerio.load(body)

    // Get Data
    data.title = $('dd.topic').text()
    data.prediger = $('dd.prediger').text()
    data.series = $('dd.series a').text()
    data.date = $('dd.date').text()
    data.length = $('dd.length').text()
    data.bible = 'Mt 6,33-36' // $('dd.bible').text() // TODO: remove
    data.bible_text = $('div.entry-container > div > p:nth-child(7)').text()
    data.predigt_text = $('div.entry-container > div > p:nth-child(9)').text()
    data.image = $('div.entry-img > img').attr('data-large-file')
    data.mp3 = $('div.entry-container > div > p.powerpress_links.powerpress_links_mp3 > a.powerpress_link_pinw').attr('href')

    // Download Images and mp3
    download(data.image).then(data1 => {
      fs.writeFileSync('tmp/image.jpg', data1)
      download(data.mp3).then(data2 => {
        fs.writeFileSync('tmp/predigt.mp3', data2)
        // Create Front-Image using data and imagemagick
        imageMagick('tmp/image.jpg')
          .resizeExact(720)
          .font('Helvetica.ttf', 36)
          .stroke('#000000', 1)
          .fill('#FFFFFF')
          .drawText(20, 48, data.title)
          .font('Helvetica.ttf', 24)
          .drawText(20, 80, data.bible)
          .drawText(20, 110, 'von ' + data.prediger)
          .drawText(590, 480, data.date)
          .write('tmp/movie_image.jpg', function (err) {
            if (err) {
              console.error('error', err)
              process.exit(3)
            } else {
              // Add watermark (logo) to image
              var command = [
                'composite',
                '-geometry 50x50+650+20',
                '-quality', 100,
                'assets/feg_logo_512.png',
                'tmp/movie_image.jpg', // input
                'tmp/movie_image_done.jpg'  // output
              ]
              execSync(command.join(' '), {stdio: [0, 1, 2]})
              // TODO: check result

              // convert predigt mp3 to aac file
              console.log('Converting predigt.mp3 to AAC')
              //execSync('ffmpeg -i tmp/predigt.mp3 -c:a aac -b:a 192k -strict -2 -y -v quiet -stats tmp/predigt.m4a', {stdio: [0, 1, 2]})
              // TODO: check result

              // create movie using Front-Image and mp3
              console.log('Creating mp4-Clip from Image and Predigt')
              //execSync('ffmpeg -hide_banner -loglevel info -r 1 -loop 1 -i tmp/movie_image_done.jpg -i tmp/predigt.m4a -acodec copy -shortest -y -v quiet -stats tmp/movie.mp4', {stdio: [0, 1, 2]})
              // TODO: check result (is there a movie.mp4?)

              // Add VOrspann, Abspann
              console.log('Adding Vorspann and Abspann to mp4-Clip')
              execSync('ffmpeg -i assets/vorspann.mp4 -c copy -bsf:v h264_mp4toannexb -f mpegts -y -v quiet -stats tmp/intermediate1.ts', {stdio: [0, 1, 2]})
              execSync('ffmpeg -i tmp/movie.mp4 -c copy -bsf:v h264_mp4toannexb -f mpegts -y -v quiet -stats tmp/intermediate2.ts', {stdio: [0, 1, 2]})
              execSync('ffmpeg -i assets/abspann.mp4 -c copy -bsf:v h264_mp4toannexb -f mpegts -y -v quiet -stats tmp/intermediate3.ts', {stdio: [0, 1, 2]})
              execSync('ffmpeg -i "concat:tmp/intermediate1.ts|tmp/intermediate2.ts|tmp/intermediate3.ts" -c copy -bsf:a aac_adtstoasc tmp/output.mp4', {stdio: [0, 1, 2]})
              // TODO: Check result

              // TODO: upload to youtube https://github.com/IonicaBizau/youtube-api/blob/master/README.md

              // TODO: cleanup tmp folder
            }
          })
      })
    })

    // TODO check if files are there
  }
})
