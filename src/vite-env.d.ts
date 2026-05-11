/// <reference types="vite/client" />
/// <reference types="@types/mdx" />

declare module "*.mdx" {
  import type { MDXProps } from "mdx/types";
  export const frontmatter: Record<string, unknown> | undefined;
  const MDXComponent: (props: MDXProps) => JSX.Element;
  export default MDXComponent;
}
