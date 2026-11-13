import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./index.css";
import { applyTheme, followPhoneTheme } from "./lib/settings";

/*
 * The theme, before anything is drawn by React.
 *
 * The script at the top of index.html has usually done this already, from one
 * word in storage. This is the same answer worked out properly — and the one
 * that counts if that word was ever missing or wrong.
 */
applyTheme();
followPhoneTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
