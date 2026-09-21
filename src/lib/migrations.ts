// Each gym has its own database, and a migration only reaches it when someone
// runs the file in that gym's SQL Editor. When a page needs a table or view a
// gym hasn't got yet, PostgREST reports "Could not find the table ... in the
// schema cache" (or Postgres says the relation "does not exist"); this turns
// that into an instruction the gym's owner or you can act on.
export function withMigrationHint(message: string, file = "0008_expenses_and_member_activity.sql") {
  return /schema cache|does not exist/i.test(message)
    ? `${message} - this database is missing an update. Run supabase/migrations/${file} in the Supabase SQL Editor.`
    : message;
}
