const fs = require('fs').promises
const path = require('path')
var moment = require('moment')
var gm = require('gm')
var imageMagick = gm.subClass({imageMagick: true})
var execSync = require('child_process').execSync

module.exports = {
  createImage: async function(config) {
    console.log('Create Poster Image for movie')
    imageMagick(config.sermon.image)
      .resize(1280, 720, '!') // shall be 1280×720 with aspect ratio
      .font('Helvetica.ttf', 36)
      .stroke('#000000', 1)
      .fill('#FFFFFF')
      .drawText(20, 48, config.sermon.title)
      .font('Helvetica.ttf', 24)
      .drawText(20, 650, config.sermon.bible)
      .drawText(20, 680, 'von ' + config.sermon.author)
      .drawText(1160, 680, config.sermon.date.format('DD.MM.YYYY')) // TODO: this must be async!
      .write(path.join(config.paths.tmp, 'movie_image.jpg'), function (err) {
        if (err) {
          throw err
        } else {
          // Add watermark (logo) to image
          var command = [
            'composite',
            '-geometry 100x100+1160+20',
            '-quality', 100,
            config.paths.watermark,
            path.join(config.paths.tmp, 'movie_image.jpg'), // input
            path.join(config.paths.tmp, 'movie_image_done.jpg')  // output
          ]
          execSync(command.join(' '), {stdio: [0, 1, 2]})
          console.log('Movie Image Done.')
        }
      })
      return config
  },
  mp3Toaac: async function(config) {
    console.log('Converting predigt.mp3 to AAC')
    try {
      execSync('ffmpeg -i "' + config.sermon.mp3 + '" -c:a aac -b:a 192k -strict -2 -y -v quiet -stats "' + path.join(config.paths.tmp, 'predigt.m4a')+'"', {stdio: [0, 1, 2]})
    } catch (error) {
      console.error(error)
      process.exit(2)
    }
    return config
  },
  createMovie: async function (config) {
    console.log('Creating mp4-Clip from Image and Predigt')
    execSync('ffmpeg -hide_banner -loglevel info -r 1 -loop 1 -i "' + path.join(config.paths.tmp, 'movie_image_done.jpg') + '" -i "' + path.join(config.paths.tmp, 'predigt.m4a') + '" -acodec copy -shortest -y -v quiet -stats "' + path.join(config.paths.tmp, 'movie.mp4')+'"', {stdio: [0, 1, 2]})
    
    console.log('Adding Vorspann and Abspann to mp4-Clip')
    execSync('ffmpeg -i "' + config.paths.vorspann + '" -c copy -bsf:v h264_mp4toannexb -f mpegts -y -v quiet -stats ' + path.join(config.paths.tmp, 'intermediate1.ts'), {stdio: [0, 1, 2]})
    execSync('ffmpeg -i "' + path.join(config.paths.tmp, 'movie.mp4') + '" -c copy -bsf:v h264_mp4toannexb -f mpegts -y -v quiet -stats ' + path.join(config.paths.tmp, 'intermediate2.ts'), {stdio: [0, 1, 2]})
    execSync('ffmpeg -i "' + config.paths.abspann + '" -c copy -bsf:v h264_mp4toannexb -f mpegts -y -v quiet -stats ' + path.join(config.paths.tmp, 'intermediate3.ts'), {stdio: [0, 1, 2]})
    execSync('ffmpeg -i "concat:' + path.join(config.paths.tmp, 'intermediate1.ts') + '|' + path.join(config.paths.tmp, 'intermediate2.ts') + '|' + path.join(config.paths.tmp, 'intermediate3.ts') + '" -c copy -bsf:a aac_adtstoasc -y -v quiet -stats ' + path.join(config.paths.outputFull, 'movie.mp4'), {stdio: [0, 1, 2]})
    
    return config
  },
  createResultFolder: async function (config) {
    config.paths.outputFull = path.join(config.paths.output, config.sermon.date.format('YYYY-MM-DD'))
    console.log('Creating Folder ' + config.paths.outputFull)
    await fs.mkdir(config.paths.outputFull)
    return config
  },
  createTextFiles: async function (config) {
    await createTitle (config)
    await createWebseite (config)
    await createDescription (config)
    await createInstagram (config)
    await createPinterest (config)
    await createTags (config)

    return config
  },
  cleanUp: async function (config) {
    console.log('Cleaning Up TMP-Folder')
    fs.unlink(path.join(config.paths.tmp, 'image.jpg'))
    fs.unlink(path.join(config.paths.tmp, 'intermediate1.ts'))
    fs.unlink(path.join(config.paths.tmp, 'intermediate2.ts'))
    fs.unlink(path.join(config.paths.tmp, 'intermediate3.ts'))
    fs.unlink(path.join(config.paths.tmp, 'movie_image_done.jpg'))
    fs.unlink(path.join(config.paths.tmp, 'movie_image.jpg'))
    fs.unlink(path.join(config.paths.tmp, 'movie.mp4'))
    fs.unlink(path.join(config.paths.tmp, 'predigt.m4a'))
    fs.unlink(path.join(config.paths.tmp, 'predigt.mp3'))
    return config
  }
}

async function createWebseite (config) {
  var lines = []
  lines.push('<!-- wp:paragraph {"dropCap":true} -->')
  lines.push('<p class="has-drop-cap">' + config.sermon.teaser + '</p>')
  lines.push('<!-- /wp:paragraph -->')
  lines.push('')
  lines.push('<!-- wp:more -->')
  lines.push('<!-- more -->')
  lines.push('<!-- /wp:more -->')
  lines.push('')
  lines.push('<!-- wp:lazyblock/predigt-meta {"prediger":"' + config.sermon.author + '","topic":"'+ config.sermon.title + '","series":"'+ config.sermon.series + '","date":"' + config.sermon.date.format('YYYY-MM-DD') + '10:00:00","length":"","bible":"'+ config.sermon.bible + '","blockId":"2h4CEQ","blockUniqueClass":"lazyblock-predigt-meta-2h4CEQ"} /-->')
  lines.push('')
  lines.push('<!-- wp:image {"id":5737,"sizeSlug":"large"} -->')
  lines.push('<!-- /wp:image -->')
  lines.push('')
  lines.push('<!-- wp:heading -->')
  lines.push('<h2>Bibeltext</h2>')
  lines.push('<!-- /wp:heading -->')

  lines.push('')
  lines.push('<!-- wp:paragraph -->')
  lines.push('<p>' + config.sermon.bibleText + '</p>')
  lines.push('<!-- /wp:paragraph -->')

  lines.push('')
  lines.push('<!-- wp:heading -->')
  lines.push('<h2>Predigttext</h2>')
  lines.push('<!-- /wp:heading -->')

  lines.push('')
  lines.push('<!-- wp:paragraph -->')
  lines.push('<p></p>')
  lines.push('<!-- /wp:paragraph -->')

  let content = lines.join('\n')
  let file = path.join(config.paths.outputFull, 'website.txt')
  await fs.writeFile(file, content)
  return config
}
async function createTitle (config) {
  let file = path.join(config.paths.outputFull, 'title.txt')
  let content = config.youtube.titleprefix + ' - ' + config.sermon.date.format('DD.MM.YYYY') + ' - ' + config.sermon.title
  await fs.writeFile(file, content)
  return config
}
async function createDescription (config) {
  var lines = []
  lines.push(config.sermon.teaser)
  lines.push('')
  lines.push(config.youtube.headline)
  lines.push('')
  lines.push('Link zur Predigtseite: ')
  lines.push('')
  lines.push('Prediger: ' + config.sermon.prediger)
  lines.push('Reihe: ' + config.sermon.series)
  lines.push('Datum: ' + config.sermon.date.format('DD.MM.YYYY'))
  lines.push('Länge: ' + config.sermon.length)
  lines.push('Bibelstelle: ' + config.sermon.bible)
  lines.push('')
  lines.push(config.sermon.bibleText)
  let content = lines.join('\n')
  let file = path.join(config.paths.outputFull, 'description.txt')
  await fs.writeFile(file, content)
  return config
}
async function createInstagram (config) {
  var lines = []
  lines.push(config.youtube.titleprefix + ' - ' + config.sermon.date.format('DD.MM.YYYY') + ' - ' + config.sermon.title)
  lines.push('')
  lines.push(config.sermon.teaser)
  lines.push('')
  lines.push(config.youtube.headline)
  lines.push('')
  lines.push('Link zum YouTube-Video: ')
  lines.push('Link zur Predigtseite: ')
  lines.push('')
  lines.push('Prediger: ' + config.sermon.prediger)
  lines.push('Reihe: ' + config.sermon.series)
  lines.push('Datum: ' + config.sermon.date.format('DD.MM.YYYY'))
  lines.push('Länge: ' + config.sermon.length)
  lines.push('Bibelstelle: ' + config.sermon.bible)
  lines.push('')
  lines.push(config.sermon.bibleText)
  lines.push('')
  lines.push('#' + config.sermon.tags.replace(/,/g, ' #') + ' #' + config.youtube.additional_tags.replace(/,/g, ' #'))
  let content = lines.join('\n')
  let file = path.join(config.paths.outputFull, 'instagram.txt')
  await fs.writeFile(file, content)
  return config
}
async function createPinterest (config) {
  var lines = []
  lines.push(config.sermon.teaser)
  lines.push('')
  lines.push(config.youtube.headline)
  let content = lines.join('\n')
  let file = path.join(config.paths.outputFull, 'pinterest.txt')
  await fs.writeFile(file, content)
  return config
}
async function createTags (config) {
  let file = path.join(config.paths.outputFull, 'tags.txt')
  let content = config.sermon.tags + ',' + config.youtube.additional_tags
  await fs.writeFile(file, content)
  return config
}