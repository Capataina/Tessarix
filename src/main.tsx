import React from "react";
import ReactDOM from "react-dom/client";
import { injectDesignTokens } from "./styles";
import App from "./App";

// Write the design tokens to :root before first paint, so CSS var(--token)
// references resolve and there is no flash of unstyled content.
injectDesignTokens();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
