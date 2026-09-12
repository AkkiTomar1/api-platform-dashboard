import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "@ui";
import { AuthProvider } from "@/lib/auth-context";
import App from "@/App";
import "@/styles/index.css";

function disableNumberScroll() {
  window.addEventListener(
    "wheel",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (target && target.tagName === "INPUT") {
        const input = target as HTMLInputElement;
        if (input.type === "number") {
          event.preventDefault();
        }
      }
    },
    { passive: false },
  );
}

disableNumberScroll();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);