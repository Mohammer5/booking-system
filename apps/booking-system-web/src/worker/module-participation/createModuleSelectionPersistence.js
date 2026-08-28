/**
 * Create narrow D1 capabilities owned by Participant Module Selection.
 *
 * @param {object} database The application D1 binding.
 * @returns {object} Guarded Selection mutation capabilities.
 */
export function createModuleSelectionPersistence(database) {
  return {
    setParticipantModuleSelection: (input) =>
      setParticipantModuleSelection(database, input),
    removeParticipantModuleSelection: (input) =>
      removeParticipantModuleSelection(database, input),
  };
}

/**
 * Atomically insert or replace one current eligible Group choice.
 *
 * @param {object} database The application D1 binding.
 * @param {object} input Candidate Selection and definite current epoch.
 * @returns {Promise<object>} Created, changed, idempotent, or refusal outcome.
 */
async function setParticipantModuleSelection(database, input) {
  const result = await upsertSelection(database, input);
  const currentSelection = await findSelectionByPair(
    database,
    input.selection.participantId,
    input.selection.moduleId,
  );

  if (result.meta.changes === 1) {
    return {
      outcome:
        currentSelection.id === input.selection.id ? "created" : "changed",
      selection: currentSelection,
    };
  }

  const refusal = await classifySelectionRefusal(database, input);

  if (refusal !== null) return { outcome: refusal };

  if (currentSelection?.groupId === input.selection.groupId) {
    return { outcome: "already-selected", selection: currentSelection };
  }

  return {
    outcome: "selection-not-set",
  };
}

/**
 * Atomically remove one current eligible Selection or preserve absence.
 *
 * @param {object} database The application D1 binding.
 * @param {object} input Participant, Course, Module, and current epoch.
 * @returns {Promise<object>} Removed, idempotent, or refusal outcome.
 */
async function removeParticipantModuleSelection(database, input) {
  const result = await deleteSelection(database, input);

  if (result.meta.changes === 1) {
    return { outcome: "removed" };
  }

  const refusal = await classifySelectionRefusal(database, {
    selection: input,
    nowEpoch: input.nowEpoch,
    requiresGroup: false,
  });

  if (refusal !== null) {
    return { outcome: refusal };
  }

  const currentSelection = await findSelectionByPair(
    database,
    input.participantId,
    input.moduleId,
  );

  return currentSelection === null
    ? { outcome: "already-absent" }
    : { outcome: "selection-not-removed" };
}

/** @returns {Promise<object>} Guarded Selection upsert result. */
function upsertSelection(database, { selection, nowEpoch }) {
  return database
    .prepare(
      `insert into module_selections
         (id, participant_id, course_id, module_id, group_id)
       select ?, ?, ?, ?, ?
        where exists (
          select 1
            from participants p
            join course_assignments a
              on a.participant_id = p.id and a.course_id = ?
            join courses c on c.id = a.course_id
            join modules m on m.id = ? and m.course_id = c.id
            join groups g on g.id = ? and g.course_id = c.id
           where p.id = ? and p.state = 'active'
             and a.state = 'active' and c.id = ? and c.state = 'active'
             and m.state = 'scheduled' and m.starts_at > ?
             and g.state = 'active'
        )
       on conflict (participant_id, module_id) do update
         set group_id = excluded.group_id
       where module_selections.group_id <> excluded.group_id`,
    )
    .bind(
      selection.id,
      selection.participantId,
      selection.courseId,
      selection.moduleId,
      selection.groupId,
      selection.courseId,
      selection.moduleId,
      selection.groupId,
      selection.participantId,
      selection.courseId,
      nowEpoch,
    )
    .run();
}

/** @returns {Promise<object>} Guarded Selection deletion result. */
function deleteSelection(database, input) {
  return database
    .prepare(
      `delete from module_selections
        where participant_id = ? and course_id = ? and module_id = ?
          and exists (
            select 1
              from participants p
              join course_assignments a
                on a.participant_id = p.id and a.course_id = ?
              join courses c on c.id = a.course_id
              join modules m on m.id = ? and m.course_id = c.id
             where p.id = ? and p.state = 'active'
               and a.state = 'active' and c.id = ? and c.state = 'active'
               and m.state = 'scheduled' and m.starts_at > ?
          )`,
    )
    .bind(
      input.participantId,
      input.courseId,
      input.moduleId,
      input.courseId,
      input.moduleId,
      input.participantId,
      input.courseId,
      input.nowEpoch,
    )
    .run();
}

/**
 * Classify a zero-change guarded mutation from authoritative current state.
 *
 * @param {object} database The application D1 binding.
 * @param {object} input Candidate Selection and definite current epoch.
 * @returns {Promise<string | null>} Refusal or null when mutation is eligible.
 */
async function classifySelectionRefusal(database, input) {
  const selection = input.selection;
  const state = await database
    .prepare(
      `select
         exists(select 1 from participants
                 where id = ? and state = 'active') as is_participant_active,
         exists(select 1 from course_assignments
                 where participant_id = ? and course_id = ?
                   and state = 'active') as is_assignment_active,
         exists(select 1 from courses
                 where id = ? and state = 'active') as is_course_active,
         exists(select 1 from modules
                 where id = ? and course_id = ? and state = 'scheduled'
                   and starts_at > ?) as is_module_selectable,
         exists(select 1 from groups
                 where id = ? and course_id = ?
                   and state = 'active') as is_group_selectable`,
    )
    .bind(
      selection.participantId,
      selection.participantId,
      selection.courseId,
      selection.courseId,
      selection.moduleId,
      selection.courseId,
      input.nowEpoch,
      selection.groupId ?? "",
      selection.courseId,
    )
    .first();

  if (state.is_participant_active !== 1) return "participant-not-active";
  if (state.is_assignment_active !== 1) return "assignment-not-active";
  if (state.is_course_active !== 1) return "course-not-active";
  if (state.is_module_selectable !== 1) return "module-not-selectable";
  if (input.requiresGroup !== false && state.is_group_selectable !== 1) {
    return "group-not-selectable";
  }

  return null;
}

/** @returns {Promise<object | null>} One current Selection pair. */
async function findSelectionByPair(database, participantId, moduleId) {
  const row = await database
    .prepare(
      `select id, participant_id, course_id, module_id, group_id
         from module_selections
        where participant_id = ? and module_id = ?`,
    )
    .bind(participantId, moduleId)
    .first();

  return row === null ? null : mapSelection(row);
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
