import { isActivationUnlocked } from "@/shared/infrastructure/auth/activationCookie";
import { ActivationKeyButton } from "./ActivationKeyButton";

/** Reads the activation cookie on the server and tells the header whether editing is unlocked. */
export const ActivationAccess = async () => <ActivationKeyButton isUnlocked={await isActivationUnlocked()} />;
