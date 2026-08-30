import { Breadcrumbs, Link, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";

/** @returns {import("react").ReactElement} Semantic Course resource hierarchy. */
export function AdminCourseBreadcrumbs({ course, trail = [] }) {
  const { t } = useTranslation();

  return (
    <Breadcrumbs aria-label={t("courseStructure.breadcrumbs.label")}>
      <Link component={RouterLink} to="/admin/courses" underline="hover">
        {t("courseStructure.breadcrumbs.courses")}
      </Link>
      {trail.length === 0 ? (
        <Typography color="text.primary">{course.name}</Typography>
      ) : (
        <Link component={RouterLink} to={`/admin/courses/${course.id}`}
          underline="hover">
          {course.name}
        </Link>
      )}
      {trail.map((item, index) => item.to === undefined ? (
        <Typography color="text.primary" key={`${item.label}-${index}`}>
          {item.label}
        </Typography>
      ) : (
        <Link component={RouterLink} key={`${item.label}-${index}`}
          to={item.to} underline="hover">
          {item.label}
        </Link>
      ))}
    </Breadcrumbs>
  );
}
