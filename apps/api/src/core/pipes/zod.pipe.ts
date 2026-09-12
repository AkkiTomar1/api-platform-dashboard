import {
  BadRequestException,
  type ArgumentMetadata,
  type PipeTransform,
} from "@nestjs/common";
import { type TypeOf, type ZodTypeAny } from "zod";

export class zodValidationPipe<T extends ZodTypeAny = ZodTypeAny>
  implements PipeTransform
{
  constructor(private readonly schema: T) {}

  transform(value: unknown, _metadata: ArgumentMetadata): TypeOf<T> {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({
        message: "Validation failed",
        issues: parsed.error.flatten(),
      });
    }
    return parsed.data;
  }
}

export function parseZod<T extends ZodTypeAny>(
  schema: T,
  value: unknown,
): TypeOf<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new BadRequestException({
      message: "Validation failed",
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data;
}