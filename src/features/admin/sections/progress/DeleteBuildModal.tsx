"use client";

import { Button, FormError, Icon, IconTile, Modal } from "@/components/ui";
import type { ProjectOut } from "@/utils/api/models";
import { useDeleteProject } from "@/utils/hooks/useDelivery";
import { useAdmin } from "../../state/AdminContext";

/** Confirm before cancelling a build (e.g. the client asked for a refund). */
export function DeleteBuildModal({
  name,
  project,
  otherBuilds,
  onClose,
}: {
  name: string;
  project: ProjectOut;
  /** How many other builds this client has (they're not touched). */
  otherBuilds: number;
  onClose: () => void;
}) {
  const { update } = useAdmin();
  const remove = useDeleteProject();
  const tasks = project.phases.reduce((n, ph) => n + ph.tasks.length, 0);

  return (
    <Modal
      open
      onClose={onClose}
      titleId="db-title"
      kicker="CANCEL BUILD"
      title={`Delete ${project.package}?`}
      width={520}
      media={
        <IconTile tone="red" size="lg">
          <Icon name="trash" size={18} />
        </IconTile>
      }
      footer={
        <>
          <Button onClick={onClose}>Keep build</Button>
          <Button
            variant="danger-solid"
            disabled={remove.isPending}
            onClick={() => remove.mutate(project.id, { onSuccess: () => update({ projectId: "", toast: `${project.package} for ${name} was deleted.` }) })}
          >
            {remove.isPending ? "Deleting…" : "Yes, delete build"}
          </Button>
        </>
      }
    >
      <p className="text-body">
        This deletes the <span className="text-strong">{project.package}</span> build ({project.progress}% done): {project.phases.length} phases,{" "}
        {tasks} tasks and {project.updates.length} progress {project.updates.length === 1 ? "update" : "updates"} for {name}. Your client
        will no longer see it in their portal.
        {otherBuilds > 0 && ` Their ${otherBuilds === 1 ? "other build stays" : `${otherBuilds} other builds stay`} as they are.`}
      </p>
      <div className="notice notice--warning u-strong" role="status">
        This can’t be undone. Their files, brand kit and links are kept, and you can start a new build for them later.
      </div>
      <FormError error={remove.error} />
    </Modal>
  );
}
