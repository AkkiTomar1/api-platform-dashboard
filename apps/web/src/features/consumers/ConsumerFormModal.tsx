import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Input, Button } from "@ui";

const consumerFormSchema = z
  .object({
    username: z.string().optional().default(""),
    customId: z.string().optional().default(""),
  })
  .refine((v) => v.username !== "" || v.customId !== "", {
    message: "Provide a username or custom id",
    path: ["username"],
  });

type FormValues = z.infer<typeof consumerFormSchema>;

export interface ConsumerFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: { username?: string; customId?: string }) => Promise<void>;
  submitting: boolean;
}

export function ConsumerFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
}: ConsumerFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(consumerFormSchema),
    defaultValues: { username: "", customId: "" },
  });

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Create consumer"
      description="A consumer represents an API client. It can be linked to a service."
    >
      <form
        onSubmit={handleSubmit((v) =>
          void onSubmit({
            username: v.username || undefined,
            customId: v.customId || undefined,
          }),
        )}
        className="space-y-4"
      >
        <Input
          label="Username"
          placeholder="my-app"
          error={errors.username?.message}
          {...register("username")}
        />
        <Input
          label="Custom ID"
          placeholder="customer-123"
          error={errors.customId?.message}
          {...register("customId")}
        />
        <div className="flex justify-end">
          <Button type="submit" loading={submitting}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}