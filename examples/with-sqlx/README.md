# with-sqlx

The minimal [sqlx](https://github.com/launchbadge/sqlx) + SQLite setup:

- `src/app.rs` — a `SqlitePool` in the application state, with the schema
  created by a single statement at startup.
- `src/routes/page.rs` — server-side props read from the database (the `db`
  handler parameter is the state field of the same name).
- `src/routes/actions.rs` — one server action inserting a row and returning
  the fresh list.

The database file (`notes.db`) is created automatically on first start;
delete it to reset. For versioned `sqlx::migrate!` migrations, a detail
route, and more, see the `kitchen-sink` example.

```sh
ossido new my-app --template with-sqlx
npm install
ossido dev
```
