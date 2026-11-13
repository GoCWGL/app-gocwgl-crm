"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { YouTubeEmbed } from "./YouTubeEmbed";

/** The course's lessons: the selected video, with the list beside it. */
export function LessonPlayer({ lessons }: { lessons: Array<{ id: string; title: string; videoId: string }> }) {
  const [current, setCurrent] = useState(0);
  const lesson = lessons[Math.min(current, lessons.length - 1)];
  return (
    <div className="lesson-player">
      <YouTubeEmbed key={lesson.id} id={lesson.videoId} title={lesson.title} />
      {lessons.length > 1 && (
        <ol className="lesson-player__list">
          {lessons.map((l, i) => (
            <li key={l.id}>
              <button type="button" aria-current={i === current || undefined} onClick={() => setCurrent(i)}>
                <span className="lesson-player__n">{i + 1}</span>
                <span className="u-grow">{l.title}</span>
                <Icon name={i === current ? "video" : "chevronRight"} size={13} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
