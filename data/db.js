import pg from "pg";

export function createDbPool(databaseConfig) {
  if (!databaseConfig) {
    return null;
  }

  const poolConfig = databaseConfig.connectionString
    ? { connectionString: databaseConfig.connectionString }
    : {
        host: databaseConfig.host,
        port: databaseConfig.port,
        database: databaseConfig.database,
        user: databaseConfig.user,
        password: databaseConfig.password
      };

  return new pg.Pool(poolConfig);
}

export async function withDb(pool, handler) {
  if (!pool) {
    throw new Error("Database pool is not configured.");
  }

  const client = await pool.connect();

  try {
    return await handler(client);
  } finally {
    client.release();
  }
}
