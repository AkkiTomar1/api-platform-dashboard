import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input, Select, Button } from "@ui";
import type { ServiceCreateInput } from "@/api/services";
import { serviceCreateSchema } from "@shared";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type FormValues = z.infer<typeof serviceCreateSchema>;

export interface ServiceFormModalProps {
  initial?: Partial<ServiceCreateInput>;
  onSubmit: (values: FormValues) => Promise<void>;
  submitting: boolean;
}

export function ServiceFormModal({ initial, onSubmit, submitting }: ServiceFormModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(serviceCreateSchema),
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      kongName: initial?.kongName ?? "",
      host: initial?.host ?? "localhost",
      path: initial?.path ?? "/",
      port: initial?.port ?? 80,
      protocol: initial?.protocol ?? "http",
      url: initial?.url ?? null,
    },
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <form onSubmit={handleSubmit((v) => void onSubmit(v))} className="space-y-4">
      <Input
        label="Name"
        placeholder="Catalog API"
        error={errors.name?.message}
        {...register("name")}
      />
      <Input
        label="Description"
        placeholder="Describe the service"
        error={errors.description?.message}
        {...register("description")}
      />
      <Input
        label="Kong Name"
        placeholder="catalog-api"
        error={errors.kongName?.message}
        {...register("kongName")}
      />

      <button
        type="button"
        onClick={() => setShowAdvanced((s) => !s)}
        className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
      >
        {showAdvanced ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {showAdvanced ? "Hide upstream" : "Configure upstream"}
      </button>

      {showAdvanced ? (
        <div className="space-y-4 rounded-lg border border-slate-200 p-4">
          <Input label="Host" error={errors.host?.message} {...register("host")} />
          <Input
            label="Path"
            error={errors.path?.message}
            {...register("path")}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Port"
              type="number"
              error={errors.port?.message}
              {...register("port", { valueAsNumber: true })}
            />
            <Select
              label="Protocol"
              error={errors.protocol?.message}
              options={[
                { value: "http", label: "http" },
                { value: "https", label: "https" },
              ]}
              {...register("protocol")}
            />
          </div>
          <Input
            label="Full URL (overrides host/path)"
            placeholder="https://api.example.com"
            error={errors.url?.message}
            {...register("url")}
          />
        </div>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" loading={submitting}>
          {initial ? "Save changes" : "Create service"}
        </Button>
      </div>
    </form>
  );
}