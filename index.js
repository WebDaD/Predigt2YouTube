var program = require('commander')
var config = require('./config.json')
const lib = require('./libs/functions.js')
const fs = require('fs').promises
const path = require('path')
var execSync = require('child_process').execSync
var moment = require('moment')
const readline = require('readline-sync')
const axios = require("axios")

program
  .version('1.0.1')
  .usage('[options] <sermon.json>')
  .option('-d, --debug', 'Debug Mode')
  .parse(process.argv)

if (!program.args.length) {
  config = checkInput(config)
}

if (!program.args.length === 1) {
  config = checkInput(config)
} else {
  config.debug = program.debug
  config.sermonFile = program.args[0]
}
try {
  main()
} catch (error) {
  console.error(error)
}


async function main() {
let fileread = await fs.readFile(config.sermonFile, 'utf8')
config.sermon = JSON.parse(fileread)

config = checkInput(config)

config.sermon.date = moment(config.sermon.date, 'YYYY-MM-DD')

const bibleAPI = axios.create({
  baseURL: 'https://api.scripture.api.bible/v1/bibles/' + config.bibleAPI.bibleID + '/passages/',
  timeout: 3000,
  headers: {'api-key': config.bibleAPI.apiKey}
})

const response = await bibleAPI.get(config.sermon.bible);
config.sermon.bibleText =  response.data.data.content

config = await lib.createResultFolder(config)

await fs.writeFile(path.join(config.paths.outputFull, 'settings.json'), JSON.stringify(config, null, 2))

config = await lib.createImage(config)
config = await lib.mp3Toaac(config)
config = await lib.createMovie(config)
config = await lib.createTextFiles(config)
config = await lib.cleanUp(config)

execSync('open ' + config.paths.outputFull, {stdio: [0, 1, 2]})
execSync('open ' + config.urls.website + ' ' + config.urls.facebook + ' ' + config.urls.youtube + ' ' + config.urls.instagram + ' ' + config.urls.pinterest, {stdio: [0, 1, 2]})
}
/* Sermon.json

{
  "title":"string",
  "tags":"string",
  "date":"YYYY-MM-DD"
  "author":"string",
  "teaser":"string",
  "bible":"string",
  "series":"string",
  "mp3":"path",
  "image":"url",
  "text":"string / path"
}

*/

function checkInput (config) {
  if(!config.sermon) config.sermon = {}

  config.sermon.title = config.sermon.title ? config.sermon.title : readline.question('Title: ')
  config.sermon.tags = config.sermon.tags ? config.sermon.tags : readline.question('Tags: ')
  config.sermon.date = config.sermon.date ? config.sermon.date : readline.question('Date (YYYY-MM-DD): ')
  config.sermon.author = config.sermon.author ? config.sermon.author : readline.question('Author: ')
  config.sermon.teaser = config.sermon.teaser ? config.sermon.teaser : readline.question('Teaser: ')
  config.sermon.bible = config.sermon.bible ? config.sermon.bible : readline.question('Bible: ')
  config.sermon.series = config.sermon.series ? config.sermon.series : readline.question('Series: ')
  config.sermon.mp3 = config.sermon.mp3 ? config.sermon.mp3 : readline.question('mp3 (absolute path): ')
  config.sermon.image = config.sermon.image ? config.sermon.image : readline.question('image (absolute path): ')
  config.sermon.text = config.sermon.text ? config.sermon.text : readline.question('text (absolute path): ')

  return config
}