import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

/**
 * Present the transient first-Admin name form.
 *
 * @param {object} props Component properties.
 * @param {object} props.bootstrapMutation The TanStack bootstrap mutation.
 * @returns {import("react").ReactElement} The registration form.
 */
export function AdminRegistrationForm({ bootstrapMutation }) {
  const { t } = useTranslation();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm({ defaultValues: { name: "" } });
  const submitName = handleSubmit(({ name }) => bootstrapMutation.mutate(name));
  const errorMessage = mutationErrorMessage(bootstrapMutation.error, t);

  return (
    <form onSubmit={submitName}>
      <label htmlFor="admin-name">
        {t("adminAccess.bootstrap.nameLabel")}
      </label>
      <input
        id="admin-name"
        autoComplete="name"
        {...register("name", {
          validate: (name) =>
            name.trim().length > 0 ||
            t("adminAccess.bootstrap.nameRequired"),
        })}
      />
      {errors.name ? <p role="alert">{errors.name.message}</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <button type="submit" disabled={bootstrapMutation.isPending}>
        {bootstrapMutation.isPending
          ? t("adminAccess.bootstrap.submitting")
          : t("adminAccess.bootstrap.submit")}
      </button>
    </form>
  );
}

/**
 * Map a language-neutral bootstrap outcome to localized presentation.
 *
 * @param {Error | null} error The mutation failure.
 * @param {(key: string) => string} translate The translation function.
 * @returns {string | null} A localized message when the mutation failed.
 */
function mutationErrorMessage(error, translate) {
  if (error === null) {
    return null;
  }

  if (error.outcome === "unauthenticated") {
    return translate("adminAccess.login.authenticationRequired");
  }

  if (error.outcome === "invalid-name") {
    return translate("adminAccess.bootstrap.nameRequired");
  }

  if (error.outcome === "bootstrap-unavailable") {
    return translate("adminAccess.bootstrap.unavailable");
  }

  return translate("adminAccess.status.technicalError");
}
