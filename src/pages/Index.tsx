import { useEffect, useRef, useState } from "react";

const HEART_IMAGE = "https://cdn.poehali.dev/projects/986b6b7e-027a-48e6-b63f-eee04168a651/files/8080bd54-5d1c-4c79-9e7b-c6c4b5e183a9.jpg";

export default function Index() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const tryPlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => {
      setIsPlaying(true);
      setHasInteracted(true);
    }).catch(() => {});
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
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

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, []);

  return (
    <div
      className="page-wrap"
      onClick={!hasInteracted ? tryPlay : undefined}
    >
      {/* Мягкие фоновые пятна */}
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />
      <div className="bg-blob blob-3" />

      {/* Основной контент */}
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

        {!hasInteracted && (
          <p className="hint">Нажмите на сердце, чтобы включить музыку</p>
        )}
      </div>

      <audio ref={audioRef} loop preload="auto" />
    </div>
  );
}
