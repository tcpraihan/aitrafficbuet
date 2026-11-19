# Videos

Drop videos here (.mp4 recommended; also .webm, .mov, .m4v), then commit and push.
They appear in the "Videos" section of the website automatically.

- Caption = file name: `shahbagh-live-demo.mp4` → "Shahbagh live demo"
- Order = alphabetical; prefix numbers to control it: `01-demo.mp4` (number hidden).
- GitHub rejects files over 100 MB. Keep each video short and compressed
  (720p H.264 MP4, ideally under ~25 MB). Compress with HandBrake, or:
    ffmpeg -i input.mov -vf scale=-2:720 -c:v libx264 -crf 28 -c:a aac -b:a 96k output.mp4
- Long videos are better on YouTube.
