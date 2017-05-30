# Predigt2YouTube

Transform Predigt-Websites into YOuTube-Videos, also upload them with one Command-Line Command :-)

## Instructions
1. Install:
  2. node.js
  3. imagemagick
  4. ghostscript
  5. ffmpeg
2. create:
  3. vorspann.mp4
  4. abspann.mp4
  5. watermark.png
6. configure config.json

Now you are able to run it:
`node app.js "FULL URL To YOUR Predigt/Podcast-Page"`

If you do not want to have the image altered (prewritten, etc...) then add `rawimage` as parameter:
`node app.js "FULL URL To YOUR Predigt/Podcast-Page" rawimage`

After that, take the Movie and the text-files in the output-folder, navigate in your browser to http://youtube.com/upload and there you go :-)

## TODO:
* better text on image
* Direct YouTube-Upload
* More Control over Result with more Options
* A little GUI
* Some Online-Service?
