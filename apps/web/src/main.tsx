import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { ToastProvider } from "@ui";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme";
import { router } from "@/router";
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
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider />
        <RouterProvider router={router} />
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
);