"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Avatar, Button, FormError, Icon } from "@/components/ui";
import { shrinkImage } from "@/lib/images";
import { myPhotoPath } from "@/utils/api/users";
import { useBlobUrl } from "@/utils/hooks/useBlobUrl";
import { useMe, useRemoveMyPhoto, useSetMyPhoto } from "@/utils/hooks/useUsers";

const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const PHOTO_MAX_MB = 4;

/** The signed-in person's avatar: their headshot when they have one, else their initials. */
export function MyAvatar(props: Omit<ComponentProps<typeof Avatar>, "src">) {
  const me = useMe().data;
  const src = useBlobUrl(myPhotoPath(me?.photo));
  return <Avatar {...props} src={src} />;
}

/**
 * Profile › headshot (admin, VA and client portals): your photo (or initials) with Upload / Replace and Remove.
 * Photos are shrunk in the browser first (a 12 MB phone photo becomes a few hundred KB), then saved straight away.
 */
export function ProfilePhotoEditor({
  name,
  avatar,
  readOnly,
  children,
}: {
  name: string;
  avatar?: Partial<ComponentProps<typeof Avatar>>;
  readOnly?: boolean;
  /** Shown beside the photo, above the buttons (e.g. the name and role). */
  children?: ReactNode;
}) {
  const me = useMe().data;
  const set = useSetMyPhoto();
  const remove = useRemoveMyPhoto();
  const [problem, setProblem] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const has = !!me?.photo;
  const busy = preparing || set.isPending || remove.isPending;

  const pick = async (file: File) => {
    set.reset();
    remove.reset();
    if (!PHOTO_TYPES.includes(file.type)) return setProblem("Choose a PNG, JPG or WebP photo.");
    setPreparing(true);
    const ready = await shrinkImage(file, { maxSide: 800, skipUnder: 300 * 1024 });
    setPreparing(false);
    if (ready.size > PHOTO_MAX_MB * 1024 * 1024) {
      return setProblem(`That photo is ${(ready.size / 1024 / 1024).toFixed(1)} MB. Use one under ${PHOTO_MAX_MB} MB.`);
    }
    setProblem(null);
    set.mutate(ready);
  };

  return (
    <div className="profile-photo">
      <MyAvatar name={name} brand ring size="xl" {...avatar} />
      <span className="stack stack--4">
        {children}
        {!readOnly && (
          <>
            <span className="cluster cluster--8">
              <label className="resume-cert__upload">
                <input
                  type="file"
                  aria-label={has ? "Replace your photo" : "Upload your photo"}
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    e.target.value = "";
                    if (picked) void pick(picked);
                  }}
                />
                <Icon name="upload" size={14} /> {preparing ? "Preparing photo…" : set.isPending ? "Uploading…" : has ? "Replace photo" : "Upload photo"}
              </label>
              {has && (
                <Button size="sm" variant="link" disabled={busy} onClick={() => remove.mutate()}>
                  {remove.isPending ? "Removing…" : "Remove"}
                </Button>
              )}
            </span>
            <span className="text-small">A clear photo of your face. PNG, JPG or WebP.</span>
            {problem && (
              <span className="field__error" role="alert">
                {problem}
              </span>
            )}
            <FormError error={set.error ?? remove.error} />
          </>
        )}
      </span>
    </div>
  );
}
