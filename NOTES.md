# Project notes

## What works

- A user can choose a local video file and preview it without any upload or server.
- The editor provides custom play, pause, seek, trim-start, and trim-end controls. The **Play selection** button starts at the trim start and pauses at the trim end.
- The preview supports grayscale, sepia, and high-contrast filters, volume, playback speed, frame capture as a PNG download, and a generated three-frame thumbnail strip.
- Empty, loading, and invalid-file states are shown in the interface.

## What does not work

- Exporting the chosen trim range as a new video file is not implemented. Browser video export requires recording/re-encoding the output (for example, with `MediaRecorder` or FFmpeg.wasm), which increases CPU time, load time, and output-file complexity.
- Trim stopping uses the browser's `timeupdate` event, so it is close to the selected time but not guaranteed to be frame-perfect.

## Three decisions I made

1. **Keep the entire editor client-side.** File input, `URL.createObjectURL`, HTML video, and canvas are browser APIs, so the editor page is a Client Component using `"use client"`. No video file leaves the user's computer.
2. **Use an object URL for the selected file.** `URL.createObjectURL(file)` creates a temporary URL the `<video>` element can play. The app revokes the URL when it is replaced or the component unmounts to avoid retaining browser memory.
3. **Prioritise trim preview over real export.** The brief gives most marks for loading, controlling, selecting, and previewing a video. A dependable trimming interface is more useful than an unfinished encoder.

## Screen recording

Replace this line with your 60–90 second recording link before submission: **ADD RECORDING LINK HERE**
