import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

// Tier 1 — Maps JS API global auth/quota failure hook + console.error tap
window.gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
};

const _origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  _origConsoleError.apply(console, args);
  const msg = args.map((a) => (typeof a === "string" ? a : "")).join(" ");
  if (/OverQuotaMapError|QuotaExceeded|OVER_QUERY_LIMIT|RESOURCE_EXHAUSTED/.test(msg)) {
    window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
  }
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
