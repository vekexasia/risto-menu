"use client";

import { forwardRef } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

interface DragHandleProps {
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
}

const DragHandle = forwardRef<HTMLButtonElement, DragHandleProps>(
  ({ listeners, attributes }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className="touch-none p-1.5 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
        {...attributes}
        {...listeners}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
        >
          <circle cx="9" cy="5" r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
      </button>
    );
  }
);

DragHandle.displayName = "DragHandle";

export default DragHandle;
