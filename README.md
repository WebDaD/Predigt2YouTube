# Predigt2YouTube

Transform Predigt-Websites into YOuTube-Videos, also upload them with one Command-Line Command :-)

## Instructions
1. Install:
  2. node.js
  3. imagemagick
  4. ghostscript
  5. ffmpeg
2. replace:
  3. assets/vorspann.mp4
  4. assets/abspann.mp4
  5. assets/watermark.png
6. configure config.json

Now you are able to run it:
`node app.js "FULL URL To YOUR Predigt/Podcast-Page"`

After that, take the Movie and the text-files in the output-folder, navigate in your browser to http://youtube.com/upload and there you go :-)

## ToDos:
* Error Checking
* Nicer Outputs

## Future Dev:
* Direct YouTube-Upload
* More Control over Result with more Options
* A little GUI
* Some Online-Service?
