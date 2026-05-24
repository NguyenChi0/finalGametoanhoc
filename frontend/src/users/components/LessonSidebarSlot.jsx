import React from "react";

const EASE = "cubic-bezier(0.33, 1, 0.68, 1)";
const DURATION = "0.32s";

export default function LessonSidebarSlot({
  open,
  onOpen,
  side = "left",
  tabLabel,
  panelId,
  children,
}) {
  const slideOut =
    side === "right" ? "translateX(12px)" : "translateX(-12px)";

  return (
    <div
      className={`lesson-sidebar-slot lesson-sidebar-slot--${side}${
        open ? "" : " is-collapsed"
      }`}
      data-side={side}
    >
      <div
        className="lesson-sidebar-slot__surface"
        aria-hidden={!open}
        {...(!open ? { inert: true } : {})}
      >
        {children}
      </div>
      <button
        type="button"
        className="lesson-sidebar-slot__tab"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onOpen}
        tabIndex={open ? -1 : 0}
      >
        {tabLabel}
      </button>

      <style>{`
        .lesson-sidebar-slot {
          --lesson-sidebar-ease: ${EASE};
          --lesson-sidebar-duration: ${DURATION};
          --lesson-sidebar-open-width: min(320px, 28vw);
          position: relative;
          flex: 0 0 auto;
          align-self: flex-start;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        @media (min-width: 960px) {
          .lesson-sidebar-slot {
            width: var(--lesson-sidebar-open-width);
            overflow: hidden;
            transition: width var(--lesson-sidebar-duration) var(--lesson-sidebar-ease);
            position: sticky;
            top: 20px;
          }
          .lesson-sidebar-slot.is-collapsed {
            width: max-content;
          }
        }
        .lesson-sidebar-slot__surface {
          width: 100%;
          opacity: 1;
          transform: translateX(0);
          transition:
            opacity 0.26s ease,
            transform var(--lesson-sidebar-duration) var(--lesson-sidebar-ease);
        }
        @media (min-width: 960px) {
          .lesson-sidebar-slot__surface {
            width: var(--lesson-sidebar-open-width);
          }
        }
        .lesson-sidebar-slot.is-collapsed .lesson-sidebar-slot__surface {
          opacity: 0;
          transform: ${slideOut};
          pointer-events: none;
        }
        @media (min-width: 960px) {
          .lesson-sidebar-slot:not(.is-collapsed) .lesson-sidebar-slot__surface {
            position: relative;
            z-index: 1;
          }
          .lesson-sidebar-slot.is-collapsed .lesson-sidebar-slot__surface {
            position: absolute;
            left: 0;
            top: 0;
            visibility: hidden;
          }
          .lesson-sidebar-slot--right.is-collapsed .lesson-sidebar-slot__surface {
            left: auto;
            right: 0;
          }
        }
        @media (max-width: 959px) {
          .lesson-sidebar-slot.is-collapsed .lesson-sidebar-slot__surface {
            max-height: 0;
            overflow: hidden;
            opacity: 0;
            transform: translateY(-8px);
            margin: 0;
            pointer-events: none;
            transition:
              opacity 0.24s ease,
              transform var(--lesson-sidebar-duration) var(--lesson-sidebar-ease),
              max-height var(--lesson-sidebar-duration) var(--lesson-sidebar-ease);
          }
          .lesson-sidebar-slot:not(.is-collapsed) .lesson-sidebar-slot__surface {
            max-height: 2000px;
            transition:
              opacity 0.26s ease 0.04s,
              transform var(--lesson-sidebar-duration) var(--lesson-sidebar-ease),
              max-height var(--lesson-sidebar-duration) var(--lesson-sidebar-ease);
          }
        }
        .lesson-sidebar-slot__tab {
          flex: 0 0 auto;
          margin: 0;
          padding: 10px 16px;
          border: 1px solid rgba(146, 185, 227, 0.55);
          border-radius: 12px;
          background: #fff;
          color: var(--cl-periwinkle, #6c7ee1);
          font-size: 0.9rem;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          box-shadow: 0 8px 28px rgba(74, 80, 128, 0.08);
          opacity: 0;
          pointer-events: none;
          transition:
            opacity 0.22s ease,
            box-shadow 0.2s ease,
            transform 0.2s ease;
        }
        @media (min-width: 960px) {
          .lesson-sidebar-slot:not(.is-collapsed) .lesson-sidebar-slot__tab {
            position: absolute;
            top: 0;
            opacity: 0;
            pointer-events: none;
          }
          .lesson-sidebar-slot--left:not(.is-collapsed) .lesson-sidebar-slot__tab {
            left: 0;
          }
          .lesson-sidebar-slot--right:not(.is-collapsed) .lesson-sidebar-slot__tab {
            right: 0;
          }
          .lesson-sidebar-slot.is-collapsed .lesson-sidebar-slot__tab {
            position: relative;
            opacity: 1;
            pointer-events: auto;
            transition:
              opacity 0.22s ease 0.08s,
              box-shadow 0.2s ease,
              transform 0.2s ease;
          }
        }
        @media (max-width: 959px) {
          .lesson-sidebar-slot.is-collapsed .lesson-sidebar-slot__tab {
            opacity: 1;
            pointer-events: auto;
            width: 100%;
            transition:
              opacity 0.22s ease 0.06s,
              box-shadow 0.2s ease,
              transform 0.2s ease;
          }
          .lesson-sidebar-slot:not(.is-collapsed) .lesson-sidebar-slot__tab {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
            opacity: 0;
            pointer-events: none;
          }
        }
        .lesson-sidebar-slot__tab:hover,
        .lesson-sidebar-slot__tab:focus-visible {
          box-shadow: 0 10px 32px rgba(74, 80, 128, 0.14);
          transform: translateY(-2px);
          outline: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .lesson-sidebar-slot,
          .lesson-sidebar-slot__surface,
          .lesson-sidebar-slot__tab {
            transition-duration: 0.01s !important;
            transition-delay: 0s !important;
          }
          .lesson-sidebar-slot.is-collapsed .lesson-sidebar-slot__surface {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
