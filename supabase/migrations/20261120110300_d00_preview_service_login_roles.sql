begin;
create role mohen_d00_authority_login login inherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls password null;
grant mohen_d00_grant_journal to mohen_d00_authority_login;
create role mohen_d00_gate_reader_login login inherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls password null;
grant mohen_gate_reader to mohen_d00_gate_reader_login;
commit;
