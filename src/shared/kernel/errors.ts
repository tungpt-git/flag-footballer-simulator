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
