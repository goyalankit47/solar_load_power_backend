# solar_load_power_backend

## System Requirements
1. Node.js must be installed.
2. postgres must be installed (Download postgres from `https://www.enterprisedb.com/downloads/postgres-postgresql-downloads`)

## Setting server locally
1. clone the repository
2. `cd solar_load_power_backend`
3. run `npm i`
4. restore given `db.dump` in postgres by running `pg_restore -U <username> -p 5432 -d <dbname> -1 db.dump`
5. Enter database_name and database_password in `knexfile.js`
6. run `npm start`
7. server is now listening on `port : { process.env.PORT || 3000 }`
