/**
 * Create fresh Participant-context resolution from persistence.
 *
 * @param {{findParticipantByExternalPrincipalId: (externalPrincipalId: string) => Promise<object | null>}} capabilities Persistence capabilities.
 * @returns {(externalPrincipalId: string) => Promise<object>} The context resolver.
 */
export function createResolveParticipantContext({
  findParticipantByExternalPrincipalId,
}) {
  return async function resolveParticipantContext(externalPrincipalId) {
    const participant = await findParticipantByExternalPrincipalId(
      externalPrincipalId,
    );

    if (participant === null) {
      return { outcome: "no-participant" };
    }

    if (participant.state === "disabled") {
      return { outcome: "disabled-participant" };
    }

    return { outcome: "active-participant", participant };
  };
}
