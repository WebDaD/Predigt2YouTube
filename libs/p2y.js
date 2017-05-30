var cheerio = require('cheerio')
var request = require('request')
var moment = require('moment')
var fs = require('fs-extra')
var path = require('path')
var download = require('download')
var gm = require('gm')
var imageMagick = gm.subClass({imageMagick: true})
var execSync = require('child_process').execSync
function p2y (config, callback) {
  extractData(config, function (error, predigtData) {
    if (error) {
      callback(error)
    } else {
      createMovieImage(config, predigtData, function (error) {
        if (error) {
          callback(error)
        } else {
          mp3toAAC(config, function (error) {
            if (error) {
              callback(error)
            } else {
              mp3tomp4(config, function (error) {
                if (error) {
                  callback(error)
                } else {
                  finalizeVideo(config, predigtData, function (error) {
                    if (error) {
                      callback(error)
                    } else {
                      makeYouTubeFiles(config, predigtData, function (error) {
                        if (error) {
                          callback(error)
                        } else {
                          cleanUpTmp(config, function (error) {
                            if (error) {
                              callback(error)
                            } else {
                              callback(null, 'Done. Go to the output-Folder and Upload the Video!')
                            }
                          })
                        }
                      })
                    }
                  })
                }
              })
            }
          })
        }
      })
    }
  })
}

function extractData (config, callback) {
  var data = {}
  console.log('Downloading Predigt-Page')
  request(config.url, function (error, response, body) {
    if (error) {
      callback(error)
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
          callback(data)
        }).catch(err => {
          callback(err)
        })
      }).catch(err => {
        callback(err)
      })
    }
  })
}
function createMovieImage (config, data, callback) {
  if (config.rawimage) {
    imageMagick(path.join(config.paths.tmp, 'image.jpg'))
      .resizeExact(720)
      .write(path.join(config.paths.tmp, 'movie_image.jpg'), function (err) {
        if (err) {
          callback(err)
        } else {
          callback(null)
        }
      })
  } else {
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
          callback(err)
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
          fs.access(path.join(config.paths.tmp, 'movie_image_done.jpg'), fs.constants.R_OK, function (err) {
            if (err) {
              callback(err)
            } else {
              callback(null)
            }
          })
        }
      })
  }
}
function mp3toAAC (config, callback) {
  console.log('Converting predigt.mp3 to AAC')
  execSync('ffmpeg -i ' + path.join(config.paths.tmp, 'predigt.mp3') + ' -c:a aac -b:a 192k -strict -2 -y -v quiet -stats ' + path.join(config.paths.tmp, 'predigt.m4a'), {stdio: [0, 1, 2]})
  fs.access(path.join(config.paths.tmp, 'predigt.m4a'), fs.constants.R_OK, function (err) {
    if (err) {
      callback(err)
    } else {
      callback(null)
    }
  })
}
function mp3tomp4 (config, callback) {
  console.log('Creating mp4-Clip from Image and Predigt')
  execSync('ffmpeg -hide_banner -loglevel info -r 1 -loop 1 -i ' + path.join(config.paths.tmp, 'movie_image_done.jpg') + ' -i ' + path.join(config.paths.tmp, 'predigt.m4a') + ' -acodec copy -shortest -y -v quiet -stats ' + path.join(config.paths.tmp, 'movie.mp4'), {stdio: [0, 1, 2]})
  fs.access(path.join(config.paths.tmp, 'movie.mp4'), fs.constants.R_OK, function (err) {
    if (err) {
      callback(err)
    } else {
      callback(null)
    }
  })
}
function finalizeVideo (config, data, callback) {
  console.log('Adding Vorspann and Abspann to mp4-Clip')
  execSync('ffmpeg -i ' + config.paths.vorspann + ' -c copy -bsf:v h264_mp4toannexb -f mpegts -y -v quiet -stats ' + path.join(config.paths.tmp, 'intermediate1.ts'), {stdio: [0, 1, 2]})
  execSync('ffmpeg -i ' + path.join(config.paths.tmp, 'movie.mp4') + ' -c copy -bsf:v h264_mp4toannexb -f mpegts -y -v quiet -stats ' + path.join(config.paths.tmp, 'intermediate2.ts'), {stdio: [0, 1, 2]})
  execSync('ffmpeg -i ' + config.paths.abspann + ' -c copy -bsf:v h264_mp4toannexb -f mpegts -y -v quiet -stats ' + path.join(config.paths.tmp, 'intermediate3.ts'), {stdio: [0, 1, 2]})
  execSync('ffmpeg -i "concat:' + path.join(config.paths.tmp, 'intermediate1.ts') + '|' + path.join(config.paths.tmp, 'intermediate2.ts') + '|' + path.join(config.paths.tmp, 'intermediate3.ts') + '" -c copy -bsf:a aac_adtstoasc -y -v quiet -stats ' + config.paths.output + data.date.format('YYYYMMDD') + '_movie.mp4', {stdio: [0, 1, 2]})
  fs.access(config.paths.output + data.date.format('YYYYMMDD') + '_movie.mp4', fs.constants.R_OK, function (err) {
    if (err) {
      callback(err)
    } else {
      callback(null)
    }
  })
}
function makeYouTubeFiles (config, data, callback) {
  console.log('Creating YouTube-Description')
  var lines = []
  lines.push(data.short)
  lines.push('')
  lines.push(config.youtube.headline)
  lines.push('')
  lines.push('Link zur Predigtseite: ' + config.url)
  lines.push('')
  lines.push('Prediger: ' + data.prediger)
  lines.push('Reihe: ' + data.series)
  lines.push('Datum: ' + data.date.format('DD.MM.YYYY'))
  lines.push('Länge: ' + data.length)
  lines.push('Bibelstelle: ' + data.bible)
  lines.push('')
  lines.push(data.bible_text)
  fs.writeFile(config.paths.output + data.date.format('YYYYMMDD') + '_description.txt', lines.join('\n'), function (err) {
    if (err) {
      return callback(err)
    } else {
      console.log('Creating YouTube-Tags')
      fs.writeFile(config.paths.output + data.date.format('YYYYMMDD') + '_tags.txt', data.tags + ',' + config.youtube.additional_tags, function (err) {
        if (err) {
          return callback(err)
        } else {
          callback(null)
        }
      })
    }
  })
}
function cleanUpTmp (config, callback) {
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
  callback(null)
}
exports.createVideo = p2y
