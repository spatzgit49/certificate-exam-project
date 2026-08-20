"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

type FilterName = "none" | "grayscale" | "sepia" | "contrast";
const filters: Record<FilterName, string> = { none: "none", grayscale: "grayscale(100%)", sepia: "sepia(85%)", contrast: "contrast(160%)" };

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "00:00";
  const seconds = Math.max(0, Math.floor(value));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [filter, setFilter] = useState<FilterName>("none");
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Please choose a video file (MP4, WebM, MOV, etc.).");
      event.target.value = "";
      return;
    }
    setError(""); setFileName(file.name); setLoading(true); setDuration(0); setCurrentTime(0);
    setTrimStart(0); setTrimEnd(0); setThumbnails([]); setVideoUrl(URL.createObjectURL(file));
  }

  function metadataLoaded() {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    setDuration(video.duration); setTrimEnd(video.duration); setLoading(false);
  }

  function seek(value: number) {
    if (videoRef.current) videoRef.current.currentTime = value;
    setCurrentTime(value);
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }

  function playSelection() {
    const video = videoRef.current;
    if (!video || trimEnd <= trimStart) return;
    video.currentTime = trimStart;
    setPreviewing(true);
    void video.play().catch(() => {
      setIsPlaying(false);
      setPreviewing(false);
    });
  }

  function updateTime() {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (previewing && video.currentTime >= trimEnd) {
      video.pause(); video.currentTime = trimEnd; setPreviewing(false);
    }
  }

  function setStart(value: number) { const next = Math.min(value, trimEnd); setTrimStart(next); if (currentTime < next) seek(next); }
  function setEnd(value: number) { const next = Math.max(value, trimStart); setTrimEnd(next); if (currentTime > next) seek(next); }

  function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.filter = filters[filter]; context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png"); link.download = `frame-${formatTime(video.currentTime).replace(":", "-")}.png`; link.click();
  }

  async function createThumbnails() {
    if (!videoUrl || !duration) return;
    setThumbnails([]);
    const hiddenVideo = document.createElement("video");
    hiddenVideo.src = videoUrl; hiddenVideo.muted = true; hiddenVideo.preload = "auto";
    await new Promise<void>((resolve, reject) => { hiddenVideo.onloadedmetadata = () => resolve(); hiddenVideo.onerror = () => reject(new Error("Frame reading failed")); });
    const frames: string[] = [];
    for (const time of [duration * 0.15, duration * 0.5, duration * 0.85]) {
      await new Promise<void>((resolve) => {
        hiddenVideo.onseeked = () => {
          const canvas = document.createElement("canvas"); canvas.width = hiddenVideo.videoWidth; canvas.height = hiddenVideo.videoHeight;
          canvas.getContext("2d")?.drawImage(hiddenVideo, 0, 0); frames.push(canvas.toDataURL("image/jpeg", 0.75)); resolve();
        };
        hiddenVideo.currentTime = time;
      });
    }
    setThumbnails(frames);
  }

  return <main className="editor-shell">
    <header className="hero"><p className="eyebrow">LOCAL-ONLY VIDEO EDITOR</p><h1>ClipCraft</h1><p>Trim, preview, filter, and capture frames without uploading your video.</p></header>
    <section className="editor-card" aria-label="Video editor">
      <label className="upload-control"><span>Choose a video</span><input type="file" accept="video/*" onChange={chooseFile} /></label>
      {error && <p className="message error" role="alert">{error}</p>}
      {!videoUrl && !error && <div className="empty-state">Choose a video from your computer to begin. Your file stays on this device.</div>}
      {videoUrl && <div className="workspace">
        <p className="file-name">Editing: {fileName}</p>{loading && <p className="message">Loading video metadata…</p>}
        <video ref={videoRef} className="video-preview" src={videoUrl} style={{ filter: filters[filter] }} onLoadedMetadata={metadataLoaded} onTimeUpdate={updateTime} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setPreviewing(false)} />
        <div className="playback-controls"><button type="button" onClick={togglePlay} disabled={!duration}>{isPlaying ? "Pause" : "Play"}</button><span>{formatTime(currentTime)} / {formatTime(duration)}</span><input aria-label="Seek video" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration)} onChange={(event) => seek(Number(event.target.value))} /></div>
        <section className="panel"><div className="panel-heading"><h2>Trim selection</h2><strong>{formatTime(trimStart)} — {formatTime(trimEnd)}</strong></div><label>Start<input type="range" min="0" max={duration || 0} step="0.1" value={trimStart} onChange={(event) => setStart(Number(event.target.value))} /></label><label>End<input type="range" min="0" max={duration || 0} step="0.1" value={trimEnd} onChange={(event) => setEnd(Number(event.target.value))} /></label><button type="button" className="primary-button" onClick={playSelection} disabled={!duration || trimEnd <= trimStart}>Play selection</button></section>
        <section className="panel utility-grid">
          <div><h2>Visual filter</h2><div className="button-row">{(Object.keys(filters) as FilterName[]).map((name) => <button type="button" className={filter === name ? "selected" : ""} onClick={() => setFilter(name)} key={name}>{name}</button>)}</div></div>
          <div><h2>Playback</h2><label>Volume: {Math.round(volume * 100)}%<input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => { const value = Number(event.target.value); setVolume(value); if (videoRef.current) videoRef.current.volume = value; }} /></label><label>Speed: {speed}×<input type="range" min="0.5" max="2" step="0.25" value={speed} onChange={(event) => { const value = Number(event.target.value); setSpeed(value); if (videoRef.current) videoRef.current.playbackRate = value; }} /></label></div>
          <div><h2>Frame tools</h2><button type="button" onClick={captureFrame}>Capture current frame</button><button type="button" onClick={() => void createThumbnails()}>Generate thumbnails</button></div>
        </section>
        {thumbnails.length > 0 && <section className="panel"><div className="panel-heading"><h2>Thumbnail strip</h2><span>Sampled across the video</span></div><div className="thumbnail-strip">{thumbnails.map((frame, index) => <img key={frame} src={frame} alt={`Video frame ${index + 1}`} />)}</div></section>}
      </div>}
    </section>
  </main>;
}
