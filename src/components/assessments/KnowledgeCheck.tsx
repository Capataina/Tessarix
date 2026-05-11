import type { ReactNode } from "react";
import "./KnowledgeCheck.css";

interface KnowledgeCheckProps {
  title?: string;
  children: ReactNode;
}

export function KnowledgeCheck({
  title = "Knowledge check",
  children,
}: KnowledgeCheckProps) {
  return (
    <section className="kc">
      <header className="kc__header">
        <span className="kc__header-mark" />
        <h2 className="kc__title">{title}</h2>
      </header>
      <div className="kc__body">{children}</div>
    </section>
  );
}
