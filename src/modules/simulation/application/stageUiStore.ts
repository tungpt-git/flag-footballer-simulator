import { create } from "zustand";

/**
 * UI-only state of the simulation stage (which dot is selected / hovered).
 * Kept apart from `simulationStore` so the engine store's shape is untouched; the canvas reads it with
 * `getState()` inside its animation loop, so changes never re-render React per frame.
 */
type StageUiStore = {
  selectedEntityId: string | null;
  hoveredEntityId: string | null;
  selectEntity: (entityId: string | null) => void;
  hoverEntity: (entityId: string | null) => void;
};

export const useStageUiStore = create<StageUiStore>((set, get) => ({
  selectedEntityId: "receiver",
  hoveredEntityId: null,
  selectEntity: (selectedEntityId) => set({ selectedEntityId }),
  hoverEntity: (hoveredEntityId) => {
    if (get().hoveredEntityId !== hoveredEntityId) set({ hoveredEntityId });
  },
}));
