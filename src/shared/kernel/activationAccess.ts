/** Header sent with roster changes. The value is checked against `ACTIVATION_KEY` on the server. */
export const ACTIVATION_KEY_HEADER = "x-activation-key";

/** Browser-tab storage for the activation key. Never sent to the client as an env var. */
export const ACTIVATION_KEY_STORAGE = "flag-football.activation-key";
