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
var moment = require('moment')
var fs = require('fs')
var path = require('path')
var download = require('download')
var gm = require('gm')
var imageMagick = gm.subClass({imageMagick: true})
var execSync = require('child_process').execSync
var config = require('./config.json')
var data = {}
console.log('Downloading Predigt-Page')
request(url, function (error, response, body) {
  if (error) {
    console.error('error:', error)
    process.exit(2)
  } else {
    var $ = cheerio.load(body)

    // Get Data
    console.log('Extracting Data')
    data.title = $(config.data.title).text()
    var tags = []
    $(config.data.tags).each(function (i, elem) {
      tags[i] = $(this).text()
    })
    data.tags = tags.join(',')
    data.prediger = $(config.data.prediger).text()
    data.series = $(config.data.series).text()
    data.date = moment($(config.data.date).text(), config.data.date_format)
    data.length = $(config.data.length).text()
    data.bible = $(config.data.bible).text()
    data.bible_text = $(config.data.bible_text).text()
    data.short = $(config.data.short).text()
    data.image = $(config.data.image).attr(config.data.image_attr)
    data.mp3 = $(config.data.mp3).attr(config.data.mp3_attr)

    // Download Images and mp3
    console.log('Downloading Image')
    download(data.image).then(data1 => {
      fs.writeFileSync(path.join(config.paths.tmp, 'image.jpg'), data1)
      console.log('Downloading mp3')
      download(data.mp3).then(data2 => {
        fs.writeFileSync(path.join(config.paths.tmp, 'predigt.mp3'), data2)
        // Create Front-Image using data and imagemagick
        console.log('Create Poster Image for movie')
        imageMagick(path.join(config.paths.tmp, 'image.jpg'))
          .resizeExact(720)
          .font('Helvetica.ttf', 36)
          .stroke('#000000', 1)
          .fill('#FFFFFF')
          .drawText(20, 48, data.title)
          .font('Helvetica.ttf', 24)
          .drawText(20, 80, data.bible)
          .drawText(20, 110, 'von ' + data.prediger)
          .drawText(590, 480, data.date.format('DD.MM.YYYY'))
          .write(path.join(config.paths.tmp, 'movie_image.jpg'), function (err) {
            if (err) {
              console.error('error', err)
              process.exit(3)
            } else {
              // Add watermark (logo) to image
              var command = [
                'composite',
                '-geometry 50x50+650+20',
                '-quality', 100,
                config.paths.watermark,
                path.join(config.paths.tmp, 'movie_image.jpg'), // input
                path.join(config.paths.tmp, 'movie_image_done.jpg')  // output
              ]
              execSync(command.join(' '), {stdio: [0, 1, 2]})
              // TODO: check result

              // TODO: show length of mp3

              // convert predigt mp3 to aac file
              console.log('Converting predigt.mp3 to AAC')
              execSync('ffmpeg -i ' + path.join(config.paths.tmp, 'predigt.mp3') + ' -c:a aac -b:a 192k -strict -2 -y -v quiet -stats ' + path.join(config.paths.tmp, 'predigt.m4a'), {stdio: [0, 1, 2]})
              // TODO: check result

              // create movie using Front-Image and mp3
              console.log('Creating mp4-Clip from Image and Predigt')
              execSync('ffmpeg -hide_banner -loglevel info -r 1 -loop 1 -i ' + path.join(config.paths.tmp, 'movie_image_done.jpg') + ' -i ' + path.join(config.paths.tmp, 'predigt.m4a') + ' -acodec copy -shortest -y -v quiet -stats ' + path.join(config.paths.tmp, 'movie.mp4'), {stdio: [0, 1, 2]})
              // TODO: check result (is there a movie.mp4?)

              // Add VOrspann, Abspann
              console.log('Adding Vorspann and Abspann to mp4-Clip')
              execSync('ffmpeg -i ' + config.paths.vorspann + ' -c copy -bsf:v h264_mp4toannexb -f mpegts -y -v quiet -stats ' + path.join(config.paths.tmp, 'intermediate1.ts'), {stdio: [0, 1, 2]})
              execSync('ffmpeg -i ' + path.join(config.paths.tmp, 'movie.mp4') + ' -c copy -bsf:v h264_mp4toannexb -f mpegts -y -v quiet -stats ' + path.join(config.paths.tmp, 'intermediate2.ts'), {stdio: [0, 1, 2]})
              execSync('ffmpeg -i ' + config.paths.abspann + ' -c copy -bsf:v h264_mp4toannexb -f mpegts -y -v quiet -stats ' + path.join(config.paths.tmp, 'intermediate3.ts'), {stdio: [0, 1, 2]})
              execSync('ffmpeg -i "concat:' + path.join(config.paths.tmp, 'intermediate1.ts') + '|' + path.join(config.paths.tmp, 'intermediate2.ts') + '|' + path.join(config.paths.tmp, 'intermediate3.ts') + '" -c copy -bsf:a aac_adtstoasc -y -v quiet -stats ' + config.paths.output + data.date.format('YYYYMMDD') + '_movie.mp4', {stdio: [0, 1, 2]})
              // TODO: Check result

              // create youtube description (5000 max) as txt
              console.log('Creating YouTube-Description')
              var lines = []
              lines.push(data.short)
              lines.push('')
              lines.push(config.youtube.headline)
              lines.push('')
              lines.push('Link zur Predigtseite: ' + url)
              lines.push('')
              lines.push('Prediger: ' + data.prediger)
              lines.push('Reihe: ' + data.series)
              lines.push('Datum: ' + data.date.format('DD.MM.YYYY'))
              lines.push('Länge: ' + data.length)
              lines.push('Bibelstelle: ' + data.bible)
              lines.push('')
              lines.push(data.bible_text)
              var description = fs.createWriteStream(config.paths.output + data.date.format('YYYYMMDD') + '_description.txt')
              description.on('error', function (err) { console.error('Error', err) })
              lines.forEach(function (v) { description.write(v + '\n') })
              description.end()

              // create youtube tags as txt
              console.log('Creating YouTube-Tags')
              var tags = fs.createWriteStream(config.paths.output + data.date.format('YYYYMMDD') + '_tags.txt')
              tags.on('error', function (err) { console.error('Error', err) })
              tags.write(data.tags + ',' + config.youtube.additional_tags)
              tags.end()

              // TODO-Future: upload to youtube https://github.com/IonicaBizau/youtube-api/blob/master/README.md

              // cleanup tmp folder
              console.log('Cleaning Up TMP-Folder')
              fs.unlinkSync(path.join(config.paths.tmp, 'image.jpg'))
              fs.unlinkSync(path.join(config.paths.tmp, 'intermediate1.ts'))
              fs.unlinkSync(path.join(config.paths.tmp, 'intermediate2.ts'))
              fs.unlinkSync(path.join(config.paths.tmp, 'intermediate3.ts'))
              fs.unlinkSync(path.join(config.paths.tmp, 'movie_image_done.jpg'))
              fs.unlinkSync(path.join(config.paths.tmp, 'movie_image.jpg'))
              fs.unlinkSync(path.join(config.paths.tmp, 'movie.mp4'))
              fs.unlinkSync(path.join(config.paths.tmp, 'predigt.m4a'))
              fs.unlinkSync(path.join(config.paths.tmp, 'predigt.mp3'))

              console.log('Done. Go to the output-Folder and Upload the Video!')
            }
          })
      })
    })

    // TODO check if files are there
  }
})
