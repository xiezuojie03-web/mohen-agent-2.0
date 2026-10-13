# DB Environment (preflight)

- PostgreSQL version: 18.6 (x86_64-windows)
- Host: 127.0.0.1
- Port: 5432 (actual; `.env.example` documents 54322 but live listener is 5432)
- Database: mohen_dev (owner: mohen_app)
- Auth user used for migration: postgres (superuser)
- Schemas present BEFORE baseline: public only (legacy v1 tables)
- New V2 schemas to be created: source, evidence, world, meaning, read_model, control
- Action taken: schema-only dump (no data export), row-count snapshot only.
- NOT performed: full data dump, backfill, destructive DDL on public.
