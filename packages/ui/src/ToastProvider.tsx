import { Toaster, toast } from "react-hot-toast";

export { toast };

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        className:
          "rounded-lg border border-hairline bg-surface-card text-sm text-ink shadow-lg",
        success: { iconTheme: { primary: "#7c3aed", secondary: "#fff" } },
      }}
    />
  );
}
