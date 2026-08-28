/**
 * Create Participant registration from narrow identity and persistence capabilities.
 *
 * @param {object} capabilities Registration capabilities.
 * @param {() => string} capabilities.createParticipantId Create a stable Participant identity.
 * @param {(candidate: object) => Promise<"created" | "participant-already-exists" | "email-already-exists">} capabilities.registerParticipant Persist one Participant atomically.
 * @returns {(input: {externalPrincipalId: string, name: unknown, email: unknown}) => Promise<object>} The registration operation.
 */
export function createRegisterParticipant({
  createParticipantId,
  registerParticipant,
}) {
  return async function registerNewParticipant({
    externalPrincipalId,
    name,
    email,
  }) {
    const profileInput = getParticipantProfileInput({ name, email });

    if (profileInput.outcome !== "valid-profile") {
      return profileInput;
    }

    const participant = {
      id: createParticipantId(),
      externalPrincipalId,
      name: profileInput.profile.name,
      email: profileInput.profile.email,
      state: "active",
    };
    const persistenceOutcome = await registerParticipant({
      ...participant,
      normalizedEmail: profileInput.profile.normalizedEmail,
    });

    if (persistenceOutcome !== "created") {
      return { outcome: persistenceOutcome };
    }

    return { outcome: "created", participant };
  };
}
import { getParticipantProfileInput } from "./getParticipantProfileInput.js";
