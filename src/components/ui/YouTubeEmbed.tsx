/** A YouTube video in its privacy-enhanced player (allowed by the app's Content-Security-Policy). */
export function YouTubeEmbed({ id, title }: { id: string; title: string }) {
  return (
    <div className="youtube-embed">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1`}
        title={title}
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
