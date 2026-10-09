/**
 * This app has no `node_modules` of its own — it builds and runs against the
 * checkout's root `node_modules`, where `@types/react-dom` is not installed
 * (that is the same gap every Vite game in this repo has). Rather than pull a
 * second copy of React's types into the folder, declare the single binding
 * `main.tsx` actually uses, so `tsc -p tsconfig.json` is clean end to end.
 */
declare module "react-dom/client" {
  import type { ReactNode } from "react";

  export interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }

  export function createRoot(container: Element | DocumentFragment): Root;
}
