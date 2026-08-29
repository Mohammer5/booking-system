/**
 * Create guarded Admin-assisted Selection persistence capabilities.
 *
 * @param {object} database The application D1 binding.
 * @returns {object} Atomic Admin-assisted Selection mutations.
 */
export function createAdminAssistedModuleSelectionPersistence(database) {
  return {
    setParticipantModuleSelectionAsAdmin: (input) =>
      setParticipantModuleSelectionAsAdmin(database, input),
    removeParticipantModuleSelectionAsAdmin: (input) =>
      removeParticipantModuleSelectionAsAdmin(database, input),
  };
}

/** @returns {Promise<object>} Atomic membership plus Selection result. */
async function setParticipantModuleSelectionAsAdmin(database, input) {
  const [creation, reactivation, selectionCreation, selectionReplacement,
    assignmentRead, selectionRead, stateRead] =
    await database.batch([
      createAssignmentStatement(database, input),
      reactivateAssignmentStatement(database, input),
      createSelectionStatement(database, input),
      replaceSelectionStatement(database, input),
      findAssignmentStatement(database, input),
      findSelectionStatement(database, input),
      classificationStatement(database, input),
    ]);
  const assignmentRow = assignmentRead.results[0];
  const selectionRow = selectionRead.results[0];
  const assignment = assignmentRow === undefined
    ? null
    : mapAssignment(assignmentRow);
  const selection = selectionRow === undefined
    ? null
    : mapSelection(selectionRow);
  const changed = [creation, reactivation, selectionCreation,
    selectionReplacement].some(
    (result) => result.meta.changes === 1,
  );

  if (!changed) {
    const refusal = classifyAdminAssistedRefusal(stateRead.results[0], true);

    if (refusal !== null) return { outcome: refusal };
  }

  if (assignment === null || selection === null) {
    return { outcome: "selection-not-set" };
  }

  return {
    outcome:
      selectionCreation.meta.changes === 1
        ? "created"
        : selectionReplacement.meta.changes === 1
          ? "changed"
          : "already-selected",
    assignmentOutcome:
      creation.meta.changes === 1
        ? "created"
        : reactivation.meta.changes === 1
          ? "reactivated"
          : "already-active",
    assignment,
    selection,
  };
}

/** @returns {Promise<object>} Guarded removal result with no membership write. */
async function removeParticipantModuleSelectionAsAdmin(database, input) {
  const [result, stateRead, selectionRead] = await database.batch([
    deleteSelectionStatement(database, input),
    classificationStatement(database, input),
    findSelectionStatement(database, input),
  ]);

  if (result.meta.changes === 1) return { outcome: "removed" };

  const refusal = classifyAdminAssistedRefusal(stateRead.results[0], false);

  if (refusal !== null) return { outcome: refusal };

  return selectionRead.results[0] === undefined
    ? { outcome: "already-absent" }
    : { outcome: "selection-not-removed" };
}

/** @returns {object} Guarded missing-Assignment insertion statement. */
function createAssignmentStatement(database, input) {
  return database
    .prepare(
      `insert or ignore into course_assignments
         (id, participant_id, course_id, state)
       select ?, ?, ?, 'active'
        where ${setEligibilitySql()}`,
    )
    .bind(...setEligibilityBindings(input, [
      input.assignment.id,
      input.assignment.participantId,
      input.assignment.courseId,
    ]));
}

/** @returns {object} Guarded retained-Assignment reactivation statement. */
function reactivateAssignmentStatement(database, input) {
  return database
    .prepare(
      `update course_assignments
          set state = 'active'
        where id = ? and participant_id = ? and course_id = ?
          and state = 'revoked'
          and ${setEligibilitySql()}`,
    )
    .bind(...setEligibilityBindings(input, [
      input.assignment.id,
      input.assignment.participantId,
      input.assignment.courseId,
    ]));
}

/** @returns {object} Guarded ordinary Selection creation statement. */
function createSelectionStatement(database, input) {
  return database
    .prepare(
      `insert into module_selections
         (id, participant_id, course_id, module_id, group_id)
       select ?, ?, ?, ?, ?
        where ${setEligibilitySql()}
          and exists (
            select 1 from course_assignments
             where participant_id = ? and course_id = ? and state = 'active'
          )
       on conflict (participant_id, module_id) do nothing`,
    )
    .bind(...setEligibilityBindings(input, [
      input.selection.id,
      input.selection.participantId,
      input.selection.courseId,
      input.selection.moduleId,
      input.selection.groupId,
    ]), input.selection.participantId, input.selection.courseId);
}

/** @returns {object} Guarded ordinary Selection Group replacement statement. */
function replaceSelectionStatement(database, input) {
  return database
    .prepare(
      `update module_selections
          set group_id = ?
        where participant_id = ? and course_id = ? and module_id = ?
          and group_id <> ?
          and ${setEligibilitySql()}
          and exists (
            select 1 from course_assignments
             where participant_id = ? and course_id = ? and state = 'active'
          )`,
    )
    .bind(...setEligibilityBindings(input, [
      input.selection.groupId,
      input.selection.participantId,
      input.selection.courseId,
      input.selection.moduleId,
      input.selection.groupId,
    ]), input.selection.participantId, input.selection.courseId);
}

/** @returns {object} Guarded Selection-only delete statement. */
function deleteSelectionStatement(database, input) {
  return database
    .prepare(
      `delete from module_selections
        where participant_id = ? and course_id = ? and module_id = ?
          and exists (
            select 1
              from admin_users ad
              join participants p on p.id = ?
              join courses c on c.id = ?
              join modules m on m.id = ? and m.course_id = c.id
             where ad.id = ? and ad.state = 'active'
               and p.state = 'active' and c.state = 'active'
               and m.state = 'scheduled' and m.starts_at > ?
          )`,
    )
    .bind(
      input.participantId,
      input.courseId,
      input.moduleId,
      input.participantId,
      input.courseId,
      input.moduleId,
      input.adminUserId,
      input.nowEpoch,
    );
}

/** @returns {string} Shared authoritative eligibility predicate. */
function setEligibilitySql() {
  return `exists (
    select 1
      from admin_users ad
      join participants p on p.id = ?
      join courses c on c.id = ?
      join modules m on m.id = ? and m.course_id = c.id
      join groups g on g.id = ? and g.course_id = c.id
     where ad.id = ? and ad.state = 'active'
       and p.state = 'active' and c.state = 'active'
       and m.state = 'scheduled' and m.starts_at > ?
       and g.state = 'active'
  )`;
}

/** @returns {Array<unknown>} Prefix plus shared guard bindings. */
function setEligibilityBindings(input, prefix) {
  return [
    ...prefix,
    input.selection.participantId,
    input.selection.courseId,
    input.selection.moduleId,
    input.selection.groupId,
    input.adminUserId,
    input.nowEpoch,
  ];
}

/** @returns {object} Current-state classification statement. */
function classificationStatement(database, input) {
  const participantId = input.selection?.participantId ?? input.participantId;
  const courseId = input.selection?.courseId ?? input.courseId;
  const moduleId = input.selection?.moduleId ?? input.moduleId;
  return database
    .prepare(
      `select
         exists(select 1 from admin_users
                 where id = ? and state = 'active') as is_admin_active,
         exists(select 1 from participants
                 where id = ? and state = 'active') as is_participant_active,
         exists(select 1 from courses
                 where id = ? and state = 'active') as is_course_active,
         exists(select 1 from modules
                 where id = ? and course_id = ?
                   and state = 'scheduled') as is_module_selectable,
         exists(select 1 from modules
                 where id = ? and course_id = ?
                   and starts_at > ?) as is_before_deadline,
         exists(select 1 from groups
                 where id = ? and course_id = ?
                   and state = 'active') as is_group_selectable`,
    )
    .bind(
      input.adminUserId,
      participantId,
      courseId,
      moduleId,
      courseId,
      moduleId,
      courseId,
      input.nowEpoch,
      input.selection?.groupId ?? "",
      courseId,
    );
}

/** @returns {string | null} Current refusal after a zero-change write. */
function classifyAdminAssistedRefusal(state, requiresGroup) {
  if (state.is_admin_active !== 1) return "admin-not-active";
  if (state.is_participant_active !== 1) return "participant-not-active";
  if (state.is_course_active !== 1) return "course-not-active";
  if (state.is_module_selectable !== 1) return "module-not-selectable";
  if (state.is_before_deadline !== 1) return "selection-deadline-reached";
  if (requiresGroup && state.is_group_selectable !== 1) {
    return "group-not-selectable";
  }

  return null;
}

/** @returns {object} One retained Assignment-pair read statement. */
function findAssignmentStatement(database, input) {
  return database
    .prepare(
      `select id, participant_id, course_id, state
         from course_assignments
        where participant_id = ? and course_id = ?`,
    )
    .bind(input.selection.participantId, input.selection.courseId);
}

/** @returns {object} One retained Selection-pair read statement. */
function findSelectionStatement(database, input) {
  const participantId = input.selection?.participantId ?? input.participantId;
  const moduleId = input.selection?.moduleId ?? input.moduleId;
  return database
    .prepare(
      `select id, participant_id, course_id, module_id, group_id
         from module_selections
        where participant_id = ? and module_id = ?`,
    )
    .bind(participantId, moduleId);
}

/** @returns {object} Booking-domain Assignment plain data. */
function mapAssignment(row) {
  return {
    id: row.id,
    participantId: row.participant_id,
    courseId: row.course_id,
    state: row.state,
  };
}

/** @returns {object} Booking-domain Selection plain data. */
function mapSelection(row) {
  return {
    id: row.id,
    participantId: row.participant_id,
    courseId: row.course_id,
    moduleId: row.module_id,
    groupId: row.group_id,
  };
}
