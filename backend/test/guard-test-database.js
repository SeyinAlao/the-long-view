// Jest globalSetup: refuse the whole run before any spec starts unless
// DATABASE_URL names a test database. The check itself lives in
// test-env.js, which every test worker also loads (see setupFiles in
// jest-e2e.json) - so a worker can never end up on a different
// database from the one approved here.
module.exports = async function globalSetup() {
  require('./test-env');
};
