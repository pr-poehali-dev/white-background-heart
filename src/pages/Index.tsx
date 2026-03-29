import { useEffect, useRef, useState } from "react";

const HEART_IMAGE = "https://cdn.poehali.dev/projects/986b6b7e-027a-48e6-b63f-eee04168a651/files/8080bd54-5d1c-4c79-9e7b-c6c4b5e183a9.jpg";
const UPLOAD_URL = "https://functions.poehali.dev/754d8118-92f8-4f85-bf71-7ca2ed01f362";

const AUDIO_KEY = "heart_audio_url";

export default function Index() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>(() => localStorage.getItem(AUDIO_KEY) || "");
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const tryPlay = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    audio.play().then(() => {
      setIsPlaying(true);
      setHasInteracted(true);
    }).catch(() => {});
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioUrl) { setShowUpload(true); return; }
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      tryPlay();
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.7;
    audio.loop = true;
    if (audioUrl) audio.src = audioUrl;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [audioUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const res = await fetch(UPLOAD_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file: base64,
            filename: file.name,
            contentType: file.type || "audio/mpeg",
          }),
        });
        const data = await res.json();
        if (data.url) {
          setAudioUrl(data.url);
          localStorage.setItem(AUDIO_KEY, data.url);
          setShowUpload(false);
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.src = data.url;
              audioRef.current.play().catch(() => {});
            }
          }, 200);
        } else {
          setUploadError("Не удалось загрузить файл");
        }
      } catch {
        setUploadError("Ошибка сети, попробуйте ещё раз");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="page-wrap"
      onClick={!hasInteracted && audioUrl ? tryPlay : undefined}
    >
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />
      <div className="bg-blob blob-3" />

      <div className="content-center">
        {/* Сердце */}
        <div
          className={`heart-wrap ${isPlaying ? "beating" : ""}`}
          onClick={togglePlay}
        >
          <img src={HEART_IMAGE} alt="сердце" className="heart-img" draggable={false} />
          {!isPlaying && (
            <div className="play-overlay">
              <div className="play-circle">▶</div>
            </div>
          )}
        </div>

        {/* Текст */}
        <div className="track-block">
          <span className="now-playing">сейчас играет</span>
          <h1 className="track-name">Для тебя</h1>
          <p className="track-sub">с любовью ♡</p>
        </div>

        {/* Мини-плеер */}
        <div className="player">
          <button className="play-btn" onClick={togglePlay}>
            {isPlaying ? (
              <span className="pause-bars"><i /><i /></span>
            ) : (
              <span className="play-triangle">▶</span>
            )}
          </button>
          <div className="waves">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className={`bar ${isPlaying ? "animating" : ""}`}
                style={{
                  "--bar-height": `${8 + Math.abs(Math.sin(i * 0.65) * 14 + Math.cos(i * 0.35) * 6)}px`,
                  "--delay": `${(i * 0.075) % 0.85}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        </div>

        {!hasInteracted && !audioUrl && (
          <p className="hint">Нажмите на сердце, чтобы добавить музыку</p>
        )}
        {!hasInteracted && audioUrl && (
          <p className="hint">Нажмите на сердце, чтобы включить музыку</p>
        )}

        {/* Кнопка смены трека — только если музыка не загружена */}
        {!audioUrl && (
          <button
            className="change-track-btn"
            onClick={(e) => { e.stopPropagation(); setShowUpload(true); }}
          >
            загрузить музыку
          </button>
        )}
      </div>

      {/* Панель загрузки */}
      {showUpload && (
        <div className="upload-overlay" onClick={() => setShowUpload(false)}>
          <div className="upload-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="upload-title">Загрузить трек</h2>
            <p className="upload-desc">Выберите аудиофайл MP3 или WAV с вашего устройства</p>

            <label className={`upload-zone ${uploading ? "loading" : ""}`}>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
                disabled={uploading}
              />
              {uploading ? (
                <span className="upload-spinner">⟳</span>
              ) : (
                <>
                  <span className="upload-icon">♪</span>
                  <span className="upload-label">Нажмите, чтобы выбрать файл</span>
                </>
              )}
            </label>

            {uploadError && <p className="upload-error">{uploadError}</p>}

            <button className="upload-cancel" onClick={() => setShowUpload(false)}>
              Отмена
            </button>
          </div>
        </div>
      )}

      <audio ref={audioRef} loop preload="auto" />
    </div>
  );
}