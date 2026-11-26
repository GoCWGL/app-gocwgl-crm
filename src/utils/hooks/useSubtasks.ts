"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import * as client from "@/utils/api/clientWork";
import type { SubtaskOut, SubtaskUpdate } from "@/utils/api/models";
import * as va from "@/utils/api/vaPortal";
import { qk } from "./keys";

type Change =
  | { op: "add"; taskId: string; title: string }
  | { op: "update"; taskId: string; subtaskId: string; body: SubtaskUpdate }
  | { op: "remove"; taskId: string; subtaskId: string };

type Endpoints<T> = {
  add: (id: string, title: string) => Promise<T>;
  update: (id: string, subtaskId: string, body: SubtaskUpdate) => Promise<T>;
  remove: (id: string, subtaskId: string) => Promise<T>;
};

/** What a task's checklist can do, the same on both portals. */
export type SubtaskActions = {
  add: (taskId: string, title: string) => Promise<unknown>;
  update: (taskId: string, subtaskId: string, body: SubtaskUpdate) => Promise<unknown>;
  remove: (taskId: string, subtaskId: string) => Promise<unknown>;
  pending: boolean;
  error: unknown;
};

/**
 * A task's (or a VA request's / project's) subtasks: ticking one off, renaming or removing it shows at once (then the server's copy replaces it), and
 * every change puts the task the server sends back straight into the board's list.
 */
function useSubtasks<T extends { id: string; subtasks?: SubtaskOut[] }>(key: QueryKey, ep: Endpoints<T>): SubtaskActions {
  const qc = useQueryClient();
  const patchTask = (taskId: string, fn: (subs: SubtaskOut[]) => SubtaskOut[]) =>
    qc.setQueryData<T[]>(key, (list) => list?.map((t) => (t.id === taskId ? { ...t, subtasks: fn(t.subtasks ?? []) } : t)));
  const m = useMutation<T, unknown, Change, { before?: T[] }>({
    mutationFn: (c) =>
      c.op === "add" ? ep.add(c.taskId, c.title) : c.op === "update" ? ep.update(c.taskId, c.subtaskId, c.body) : ep.remove(c.taskId, c.subtaskId),
    onMutate: async (c) => {
      if (c.op === "add") return {};
      await qc.cancelQueries({ queryKey: key, exact: true });
      const before = qc.getQueryData<T[]>(key);
      patchTask(c.taskId, (subs) =>
        c.op === "remove"
          ? subs.filter((s) => s.id !== c.subtaskId)
          : subs.map((s) => (s.id === c.subtaskId ? { ...s, ...c.body, title: c.body.title ?? s.title, done: c.body.done ?? s.done, position: c.body.position ?? s.position } : s)),
      );
      return { before };
    },
    onError: (_e, _c, ctx) => {
      if (ctx?.before) qc.setQueryData(key, ctx.before);
    },
    onSuccess: (task) => qc.setQueryData<T[]>(key, (list) => list?.map((t) => (t.id === task.id ? { ...t, ...task } : t))),
  });
  return {
    add: (taskId, title) => m.mutateAsync({ op: "add", taskId, title }),
    update: (taskId, subtaskId, body) => m.mutateAsync({ op: "update", taskId, subtaskId, body }),
    remove: (taskId, subtaskId) => m.mutateAsync({ op: "remove", taskId, subtaskId }),
    pending: m.isPending,
    error: m.error,
  };
}

/** Client portal › a task's subtasks. */
export const useProjectSubtasks = () =>
  useSubtasks(qk.portalProjects, { add: client.addProjectSubtask, update: client.updateProjectSubtask, remove: client.deleteProjectSubtask });

/** VA portal › a task's subtasks. */
export const useVaTaskSubtasks = () => useSubtasks(qk.vaTasks, { add: va.addVaTaskSubtask, update: va.updateVaTaskSubtask, remove: va.deleteVaTaskSubtask });

/** Client portal › a VA request's or open project's subtasks. */
export const useRequestSubtasks = () =>
  useSubtasks(qk.portalVaRequests, { add: client.addRequestSubtask, update: client.updateRequestSubtask, remove: client.deleteRequestSubtask });

/** VA portal › the subtasks of a project the VA is on. */
export const useVaProjectSubtasks = () =>
  useSubtasks([...qk.vaTasks, "projects"], { add: va.addVaProjectSubtask, update: va.updateVaProjectSubtask, remove: va.deleteVaProjectSubtask });
