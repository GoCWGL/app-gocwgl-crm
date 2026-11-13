import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CountChip } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import type { Tone } from "@/lib/tones";

type SidebarProps = {
  label: string;
  className?: string;
  brand?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

/** Sticky left navigation column. */
export function Sidebar({ label, className, brand, footer, children }: SidebarProps) {
  return (
    <nav className={cn("sidebar", className)} aria-label={label}>
      {brand && <div className="sidebar__brand">{brand}</div>}
      <div className="sidebar__nav">{children}</div>
      {footer && <div className="sidebar__footer">{footer}</div>}
    </nav>
  );
}

/** Group of nav items with an optional mono heading ("SALES"). */
export function SidebarGroup({ title, className, children }: { title?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className ? `sidebar__group ${className}` : "sidebar__group"}>
      {title && <span className="sidebar__label">{title}</span>}
      {children}
    </div>
  );
}

type NavItemProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: { text: string; tone: Tone };
  /** For collapsible parents: shows a chevron and sets aria-expanded. */
  expanded?: boolean;
  /** Parent of the current page (lighter highlight). */
  highlighted?: boolean;
  /** Greyed out with a lock; `lockedHint` says when it opens. */
  locked?: boolean;
  lockedHint?: string;
  /** Hover text, e.g. when the label is hidden in an icon-only menu. */
  tooltip?: string;
  className?: string;
};

export function NavItem({ icon, label, active, onClick, badge, expanded, highlighted, locked, lockedHint, tooltip, className }: NavItemProps) {
  const collapsible = expanded !== undefined;
  return (
    <button
      type="button"
      className={cn("nav-item", highlighted && "nav-item--open", locked && "nav-item--locked", className)}
      onClick={locked ? undefined : onClick}
      aria-disabled={locked || undefined}
      title={locked ? lockedHint : tooltip}
      aria-label={tooltip}
      aria-current={active ? "page" : undefined}
      aria-expanded={collapsible ? expanded : undefined}
    >
      {icon}
      <span className="nav-item__label">
        {label}
        {locked && lockedHint && <span className="nav-item__hint">{lockedHint}</span>}
      </span>
      {locked && <Icon name="lock" size={13} strokeWidth={2.2} className="nav-item__lock" />}
      {badge && <CountChip tone={badge.tone}>{badge.text}</CountChip>}
      {collapsible && (
        <Icon
          name="chevronRight"
          size={14}
          strokeWidth={2.2}
          className={cn("nav-item__chevron", expanded && "nav-item__chevron--open")}
        />
      )}
    </button>
  );
}

type ProfileButtonProps = {
  avatar: ReactNode;
  name: string;
  subtitle: string;
  active?: boolean;
  onClick: () => void;
  trailing?: ReactNode;
};

/** Account button pinned to the bottom of the sidebar. */
export function ProfileButton({ avatar, name, subtitle, active, onClick, trailing }: ProfileButtonProps) {
  return (
    <button
      type="button"
      className="profile-button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      {avatar}
      <span className="profile-button__text">
        <span className="profile-button__name">{name}</span>
        <span className="profile-button__sub">{subtitle}</span>
      </span>
      {trailing}
    </button>
  );
}
