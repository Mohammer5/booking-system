import { useQuery } from "@tanstack/react-query";

/**
 * Read the current Active Participant's assigned Active Courses.
 *
 * @returns {object} TanStack Participant Course-list query state.
 */
export function useParticipantCourseList() {
  return useQuery({
    queryKey: ["course-access", "participant-courses"],
    queryFn: () => requestJson("/api/participant/courses"),
    retry: false,
  });
}

/**
 * Read one freshly authorized Participant Course by stable identity.
 *
 * @param {string} courseId Stable Participant Course route identity.
 * @returns {object} TanStack Participant Course-detail query state.
 */
export function useParticipantCourseDetail(courseId) {
  return useQuery({
    queryKey: ["course-access", "participant-course", courseId],
    queryFn: () => requestJson(`/api/participant/courses/${courseId}`),
    retry: false,
  });
}

/**
 * Perform one slice-owned same-origin Participant Course request.
 *
 * @param {string} path Same-origin Participant Course path.
 * @returns {Promise<object>} Successful JSON response.
 */
async function requestJson(path) {
  const response = await fetch(path);
  const body = await response.json();

  if (!response.ok) {
    const error = new Error(body.outcome ?? "technical-error");

    error.outcome = body.outcome ?? "technical-error";
    error.status = response.status;
    throw error;
  }

  return body;
}
