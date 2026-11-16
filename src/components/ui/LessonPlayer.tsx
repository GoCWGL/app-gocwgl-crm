"use client";

import { useState } from "react";
import type { LessonFileOut } from "@/utils/api/models";
import { lessonVideo, type AnyLesson } from "@/lib/video";
import { Icon } from "./Icon";
import { LessonReading } from "./LessonReading";
import { LessonVideo } from "./LessonVideo";

type PlayerLesson = AnyLesson & { id: string; title: string; body?: string; file?: LessonFileOut | null };

/** The course's lessons: the selected video or reading, with the list beside it (staff preview). */
export function LessonPlayer({ lessons, filePath }: { lessons: PlayerLesson[]; filePath: (fileId: string) => string }) {
  const [current, setCurrent] = useState(0);
  const lesson = lessons[Math.min(current, lessons.length - 1)];
  const video = lessonVideo(lesson);
  return (
    <div className="lesson-player">
      {video ? (
        <LessonVideo key={lesson.id} video={video} title={lesson.title} />
      ) : (
        <LessonReading key={lesson.id} title={lesson.title} body={lesson.body ?? ""} file={lesson.file} filePath={lesson.file ? filePath(lesson.file.id) : null} />
      )}
      {lessons.length > 1 && (
        <ol className="lesson-player__list">
          {lessons.map((l, i) => (
            <li key={l.id}>
              <button type="button" aria-current={i === current || undefined} onClick={() => setCurrent(i)}>
                <span className="lesson-player__n">{i + 1}</span>
                <span className="u-grow">{l.title}</span>
                <Icon name={i === current ? (l.kind === "reading" ? "form" : "video") : "chevronRight"} size={13} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
