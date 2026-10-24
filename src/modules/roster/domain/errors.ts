import { NotFoundError } from "@/shared/kernel/errors";

export class PlayerNotFoundError extends NotFoundError {
  constructor() {
    super("Player not found");
  }
}
