#!/bin/sh
set -e
node src/db/migrate.js
exec node src/index.js
