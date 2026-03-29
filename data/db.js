import pg from "pg";

export function createDbClient(databaseConfig) {
  if (!databaseConfig) {
    return null;
  }

  if (databaseConfig.connectionString) {
    return new pg.Client({ connectionString: databaseConfig.connectionString });
  }

  return new pg.Client({
    host: databaseConfig.host,
    port: databaseConfig.port,
    database: databaseConfig.database,
    user: databaseConfig.user,
    password: databaseConfig.password
  });
}

export async function withDb(client, handler) {
  if (!client) {
    throw new Error("Database client is not configured.");
  }

  await client.connect();

  try {
    return await handler(client);
  } finally {
    await client.end();
  }
}
