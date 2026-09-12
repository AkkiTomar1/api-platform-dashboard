import { Toaster, toast } from "react-hot-toast";

export { toast };

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        className:
          "rounded-lg border border-slate-200 bg-white text-sm text-slate-800 shadow-lg",
        success: { iconTheme: { primary: "#7c3aed", secondary: "#fff" } },
      }}
    />
  );
}
