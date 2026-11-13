"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { lessonPlayerSrc, lessonThumb, lessonVideoHost, VIDEO_PROVIDER_LABEL, type LessonVideoSource } from "@/lib/video";
import { Icon } from "./Icon";

/**
 * A lesson's video: a poster with a play button; the provider's player (YouTube, Loom or Vimeo) only loads once
 * play is pressed. Give it a `key` per lesson so switching lessons goes back to the poster.
 */
export function LessonVideo({ video, title, className }: { video: LessonVideoSource; title: string; className?: string }) {
  const [playing, setPlaying] = useState(false);
  const thumb = lessonThumb(video);
  return (
    <div className={cn("lesson-video", className)}>
      {playing ? (
        <iframe
          src={lessonPlayerSrc(video, true)}
          title={title}
          allow="autoplay; accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" className="lesson-video__poster" onClick={() => setPlaying(true)} aria-label={`Play “${title}”`}>
          {thumb && (
            // eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail
            <img src={thumb} alt="" loading="lazy" />
          )}
          <span className="lesson-video__play">
            <Icon name="play" size={20} />
          </span>
          <span className="lesson-video__tag">
            <strong>{VIDEO_PROVIDER_LABEL[video.provider]}</strong>
            <span>{lessonVideoHost(video)}</span>
          </span>
        </button>
      )}
    </div>
  );
}
