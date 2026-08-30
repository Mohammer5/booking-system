import { Navigate, Route, Routes, useParams } from "react-router";

import {
  AdminInviteOnboardingPage,
  AdminInvitePage,
  AdminUserDetailPage,
  AdminUserDirectoryPage,
} from "./admin-access/index.js";
import { AdminBootstrapPage } from "./admin-bootstrap/index.js";
import { ResponsiveApplicationShell } from "./application-shell/index.js";
import {
  AdminParticipantDetailPage,
  CourseParticipantCollectionPage,
  CourseParticipantDetailPage,
  CourseInvitePage,
  ParticipantCourseDetailPage,
  ParticipantDirectoryPage,
  ParticipantProfilePage,
} from "./course-access/index.js";
import {
  CourseCreatePage,
  CourseDetailPage,
  CourseIndexPage,
  GroupCollectionPage,
  GroupCreatePage,
  GroupDetailPage,
} from "./course-structure/index.js";
import {
  ParticipantEntryPage,
  ParticipantHomePage,
} from "./participant-entry/index.js";

/**
 * Define the language-independent browser route tree.
 *
 * @returns {import("react").ReactElement} The browser application.
 */
export function BrowserApplication() {
  return (
    <Routes>
      <Route
        path="/admin/invite"
        element={
          <ResponsiveApplicationShell context="admin">
            <AdminInviteOnboardingPage />
          </ResponsiveApplicationShell>
        }
      />
      <Route
        path="/invite"
        element={
          <ResponsiveApplicationShell context="participant">
            <CourseInvitePage />
          </ResponsiveApplicationShell>
        }
      />
      <Route
        path="/"
        element={
          <ResponsiveApplicationShell context="participant">
            <ParticipantEntryPage />
          </ResponsiveApplicationShell>
        }
      >
        <Route index element={<ParticipantHomePage />} />
        <Route path="profile" element={<ParticipantProfilePage />} />
        <Route
          path="courses/:courseId"
          element={<ParticipantCourseDetailPage />}
        />
      </Route>
      {administrationRoute()}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** @returns {import("react").ReactElement} Nested Admin application routes. */
function administrationRoute() {
  return (
    <Route
      path="/admin"
      element={<AdminBootstrapPage />}
    >
      <Route index element={<Navigate to="courses" replace />} />
      <Route path="invites" element={<AdminInvitePage />} />
      <Route path="users" element={<AdminUserDirectoryPage />} />
      <Route path="users/:adminUserId" element={<AdminUserDetailPage />} />
      <Route path="participants" element={<ParticipantDirectoryPage />} />
      <Route
        path="participants/:participantId"
        element={<AdminParticipantDetailPage />}
      />
      <Route path="courses" element={<CourseIndexPage />} />
      <Route path="courses/new" element={<CourseCreatePage />} />
      <Route
        path="courses/:courseId/groups"
        element={<GroupCollectionPage />}
      />
      <Route
        path="courses/:courseId/groups/new"
        element={<GroupCreatePage />}
      />
      <Route
        path="courses/:courseId/groups/:groupId"
        element={<GroupDetailPage />}
      />
      <Route
        path="courses/:courseId/participants"
        element={<CourseParticipantCollectionPage />}
      />
      <Route
        path="courses/:courseId/participants/:participantId"
        element={<CourseParticipantDetailPage />}
      />
      <Route
        path="courses/:courseId/participation"
        element={<ParticipationCompatibilityRedirect />}
      />
      <Route
        path="courses/:courseId/participation/:participantId"
        element={<ParticipationCompatibilityRedirect detail />}
      />
      <Route path="courses/:courseId" element={<CourseDetailPage />} />
    </Route>
  );
}

/** @returns {import("react").ReactElement} Replace one superseded browser URL. */
function ParticipationCompatibilityRedirect({ detail = false }) {
  const { courseId, participantId } = useParams();
  const suffix = detail ? `/${participantId}` : "";

  return <Navigate to={`/admin/courses/${courseId}/participants${suffix}`} replace />;
}
