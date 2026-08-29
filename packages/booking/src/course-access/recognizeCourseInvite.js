/**
 * Derive the complete minimal public meaning of one recognized Invite record.
 *
 * @param {object | null} recognizedInvite Current persistence recognition.
 * @returns {object} Private unknown or Course-name-only recognized result.
 */
export function recognizeCourseInvite(recognizedInvite) {
  if (!isRecognizedCourseInvite(recognizedInvite)) {
    return { outcome: "invite-unavailable" };
  }

  const isAvailable =
    recognizedInvite.isCurrent === true &&
    recognizedInvite.inviteState === "enabled" &&
    recognizedInvite.courseState === "active";

  return {
    outcome: isAvailable ? "available" : "unavailable",
    courseName: recognizedInvite.courseName,
  };
}

/** @returns {boolean} Whether persistence returned one narrow known Invite. */
function isRecognizedCourseInvite(value) {
  return (
    typeof value?.courseName === "string" &&
    value.courseName.trim().length > 0 &&
    new Set(["active", "archived"]).has(value.courseState) &&
    new Set(["enabled", "disabled"]).has(value.inviteState) &&
    typeof value.isCurrent === "boolean"
  );
}
