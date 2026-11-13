"use client";

import { useState } from "react";
import type { LessonVideoSource } from "@/lib/video";
import { Icon } from "./Icon";
import { LessonVideo } from "./LessonVideo";

/** The course's lessons: the selected video, with the list beside it (staff preview). */
export function LessonPlayer({ lessons }: { lessons: Array<LessonVideoSource & { id: string; title: string }> }) {
  const [current, setCurrent] = useState(0);
  const lesson = lessons[Math.min(current, lessons.length - 1)];
  return (
    <div className="lesson-player">
      <LessonVideo key={lesson.id} video={lesson} title={lesson.title} />
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
