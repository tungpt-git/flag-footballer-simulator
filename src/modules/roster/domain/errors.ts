import { ConflictError, NotFoundError } from "@/shared/kernel/errors";

export class PlayerNotFoundError extends NotFoundError {
  constructor() {
    super("Player not found");
  }
}

export class JerseyNumberTakenError extends ConflictError {
  constructor() {
    super("That jersey number is already taken");
  }
}
