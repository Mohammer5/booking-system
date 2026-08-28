import { Navigate, Route, Routes } from "react-router";

import {
  AdminBootstrapPage,
  AdministrationContextRoute,
} from "./admin-bootstrap/index.js";
import { ResponsiveApplicationShell } from "./application-shell/index.js";
import {
  AdminParticipantDetailPage,
  ParticipantCourseDetailPage,
  ParticipantDirectoryPage,
  ParticipantProfilePage,
} from "./course-access/index.js";
import {
  CourseCreatePage,
  CourseDetailPage,
  CourseIndexPage,
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
      <Route
        path="/admin"
        element={
          <ResponsiveApplicationShell context="admin">
            <AdminBootstrapPage />
          </ResponsiveApplicationShell>
        }
      >
        <Route index element={<AdministrationContextRoute />} />
        <Route path="participants" element={<ParticipantDirectoryPage />} />
        <Route
          path="participants/:participantId"
          element={<AdminParticipantDetailPage />}
        />
        <Route path="courses" element={<CourseIndexPage />} />
        <Route path="courses/new" element={<CourseCreatePage />} />
        <Route path="courses/:courseId" element={<CourseDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
