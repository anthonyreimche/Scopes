// This extension never brings its own React: the host injects the single
// instance it renders with at activate(), and every element created here
// must go through that instance or hooks silently break.

import type { Attributes, ComponentType, ReactElement, ReactNode } from "react";
import type { SafelightAPI } from "./safelight";

let boundApi: SafelightAPI | null = null;

export function initRuntime(api: SafelightAPI): void {
  boundApi = api;
}

export function api(): SafelightAPI {
  if (boundApi === null) throw new Error("[vectorscope] api() called before activate()");
  return boundApi;
}

export function h<P extends object>(
  type: string | ComponentType<P>,
  props?: (Attributes & P) | null,
  ...children: ReactNode[]
): ReactElement {
  return api().react.createElement(type, props, ...children);
}
