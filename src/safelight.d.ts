// A hand-written subset of Safelight's extension API — only the pieces
// Vectorscope calls — kept aligned with the host's src/extensions/types.ts,
// src/extensions/ui-kit.tsx, src/extensions/develop-host.tsx and
// src/state/develop-store.ts. An installed extension ships as a standalone
// bundle with no access to the host's source tree, so these declarations
// stand in for it; @types/react supplies the React types, at build time only.

import type { ComponentType, CSSProperties, ReactNode } from "react";

export interface StoreApi<T> {
  (): T;
  <U>(selector: (state: T) => U): U;
  getState(): T;
  setState(partial: Partial<T> | ((s: T) => Partial<T>)): void;
  subscribe(listener: (state: T, prev: T) => void): () => void;
}

export type StateCreator<T> = (
  set: (partial: Partial<T> | ((s: T) => Partial<T>)) => void,
  get: () => T,
) => T;

/** Core develop params: opaque here, only ever handed back to core. */
export type DevelopParams = Record<string, unknown> & { readonly __develop: unique symbol };

export interface DevelopStoreState {
  photoId: string | null;
  params: DevelopParams;
  previewParams: DevelopParams | null;
  histogram: object | null;
}

export interface ThemeStoreState {
  activeId: string;
}

export interface StageSpace {
  encoding?: "linear" | "perceptual";
  primaries?: "rec709" | "rec2020";
}

/** RGBA floats, rows top-down, in `space`. Alpha is 1. */
export interface FloatFrame {
  data: Float32Array;
  width: number;
  height: number;
  space: StageSpace;
  point: "pre-output" | "output" | "scene";
}

export interface FloatCaptureOptions {
  space?: StageSpace;
  point?: FloatFrame["point"];
  /** The frame's long edge in pixels. */
  maxEdge?: number;
}

export interface OverlayRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DevelopOverlayState {
  rect: OverlayRect | null;
  nonce: number;
}

export interface PanelContribution {
  id: string;
  title: string;
  component: ComponentType;
  defaultDock?: {
    module: "library" | "develop";
    direction: "left" | "right" | "bottom";
    order?: number;
    width?: number;
    height?: number;
  };
  /** The modules the panel may be docked in; omitted, every module (Safelight 3.2.8). */
  modules?: readonly string[];
  onReset?: () => void;
}

export interface SlotContribution {
  id: string;
  slot: "develop-canvas-overlay" | "develop-toolbar" | "library-toolbar" | "library-subbar";
  component: ComponentType;
  order?: number;
}

export type SettingsField =
  | { key: string; label: string; hint?: string; type: "boolean"; default: boolean }
  | {
      key: string;
      label: string;
      hint?: string;
      type: "number";
      default: number;
      min?: number;
      max?: number;
      step?: number;
    }
  | {
      key: string;
      label: string;
      hint?: string;
      type: "select";
      default: string;
      options: { value: string; label: string }[];
    };

export interface SettingsContribution {
  title?: string;
  fields: SettingsField[];
  order?: number;
  keywords?: string[];
}

export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  active?: boolean;
  full?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?(): void;
  children?: ReactNode;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange(value: string): void;
  options?: SelectOption[];
  disabled?: boolean;
  ariaLabel?: string;
  title?: string;
}

export interface SegmentedOption {
  value: string;
  label: ReactNode;
  title?: string;
}

export interface SegmentedControlProps {
  value: string;
  onChange(value: string): void;
  options: SegmentedOption[];
  size?: "sm" | "md";
}

export interface RowProps {
  children?: ReactNode;
  gap?: number;
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  wrap?: boolean;
  style?: CSSProperties;
}

export interface StackProps {
  children?: ReactNode;
  gap?: number;
  style?: CSSProperties;
}

export interface UiKit {
  Button: ComponentType<ButtonProps>;
  Select: ComponentType<SelectProps>;
  SegmentedControl: ComponentType<SegmentedControlProps>;
  Row: ComponentType<RowProps>;
  Stack: ComponentType<StackProps>;
  tokens: Readonly<Record<string, string>>;
}

export interface SafelightAPI {
  version: 1;
  extensionId: string;
  /** The app's React instance — plugins must use this, not their own copy. */
  react: typeof import("react");
  registerPanel(c: PanelContribution): void;
  registerSlot(c: SlotContribution): void;
  unregisterSlot(id: string): void;
  registerSettings(c: SettingsContribution): void;
  settings: {
    get<T>(key: string, fallback: T): T;
    set(key: string, value: unknown): void;
    onChange(cb: (key: string, value: unknown) => void): () => void;
  };
  ui: UiKit;
  stores: {
    create<T>(init: StateCreator<T>): StoreApi<T>;
    useDevelopStore: StoreApi<DevelopStoreState>;
    useThemeStore: StoreApi<ThemeStoreState>;
  };
  develop: {
    useDevelopOverlay(): DevelopOverlayState;
    captureFrame(params: DevelopParams): Promise<ImageBitmap>;
    /** Undefined on cores older than 3.1.0. */
    captureFloatFrame?(params: DevelopParams, opts?: FloatCaptureOptions): Promise<FloatFrame | null>;
  };
}

export interface ExtensionModule {
  activate(api: SafelightAPI): void;
  deactivate?(): void;
}
