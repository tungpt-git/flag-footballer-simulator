/** Base class for business-rule failures. Infrastructure maps the subclasses to transport codes. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The requested aggregate does not exist. */
export class NotFoundError extends DomainError {}

/** The operation conflicts with the current state (for example a uniqueness rule). */
export class ConflictError extends DomainError {}

/** The caller is not allowed to perform the operation. */
export class UnauthorizedError extends DomainError {}

/** A required server setting is missing, so the operation cannot run. */
export class ServiceUnavailableError extends DomainError {}
