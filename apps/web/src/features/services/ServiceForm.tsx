import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input, Select, Button } from "@ui";
import type { ServiceCreateInput } from "@/api/services";
import { serviceCreateSchema, SERVICE_PROTOCOLS } from "@shared";

type FormValues = z.infer<typeof serviceCreateSchema>;

export interface ServiceFormModalProps {
  initial?: Partial<ServiceCreateInput>;
  onSubmit: (values: FormValues) => Promise<void>;
  submitting: boolean;
}

const protocolOptions = SERVICE_PROTOCOLS.map((p) => ({
  value: p,
  label: p,
}));

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
      ownerContact: initial?.ownerContact ?? "",
      connectTimeout: initial?.connectTimeout ?? 60000,
      writeTimeout: initial?.writeTimeout ?? 60000,
      readTimeout: initial?.readTimeout ?? 60000,
      retries: initial?.retries ?? 5,
    },
  });

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
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Kong Name"
          placeholder="catalog-api"
          error={errors.kongName?.message}
          {...register("kongName")}
        />
        <Input
          label="Owner Contact"
          placeholder="team@example.com"
          hint="Optional"
          error={errors.ownerContact?.message}
          {...register("ownerContact")}
        />
      </div>
      <Input
        label="Upstream URL"
        placeholder="https://api.example.com"
        hint="Optional. If set, overrides the host / port / path / protocol below."
        error={errors.url?.message}
        {...register("url")}
      />

      <div className="space-y-4 rounded-lg border border-hairline bg-surface-inset/50 p-4">
        <p className="text-sm font-medium text-ink-strong">Upstream target</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Host" error={errors.host?.message} {...register("host")} />
          <Input
            label="Port"
            type="number"
            error={errors.port?.message}
            {...register("port", { valueAsNumber: true })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Path" error={errors.path?.message} {...register("path")} />
          <Select
            label="Protocol"
            error={errors.protocol?.message}
            options={protocolOptions}
            {...register("protocol")}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-hairline bg-surface-inset/50 p-4">
        <p className="text-sm font-medium text-ink-strong">Timeouts & retries</p>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Connect timeout (ms)"
            type="number"
            error={errors.connectTimeout?.message}
            {...register("connectTimeout", { valueAsNumber: true })}
          />
          <Input
            label="Read timeout (ms)"
            type="number"
            error={errors.readTimeout?.message}
            {...register("readTimeout", { valueAsNumber: true })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Write timeout (ms)"
            type="number"
            error={errors.writeTimeout?.message}
            {...register("writeTimeout", { valueAsNumber: true })}
          />
          <Input
            label="Retries"
            type="number"
            error={errors.retries?.message}
            {...register("retries", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" loading={submitting}>
          {initial ? "Save changes" : "Create service"}
        </Button>
      </div>
    </form>
  );
}