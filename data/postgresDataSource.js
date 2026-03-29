import { createDbClient, withDb } from "./db.js";

export function createPostgresDataSource(databaseConfig) {
  return {
    async loadSecurities({ indexMembership = null } = {}) {
      const client = createDbClient(databaseConfig);
      return withDb(client, async (db) => {
        const query = indexMembership
          ? `
              SELECT id, ticker, sector, industry, index_membership
              FROM securities
              WHERE index_membership = $1
              ORDER BY ticker
            `
          : `
              SELECT id, ticker, sector, industry, index_membership
              FROM securities
              ORDER BY ticker
            `;
        const params = indexMembership ? [indexMembership] : [];
        const result = await db.query(query, params);
        return result.rows;
      });
    },

    async loadDailyCandles({ securityIds, startDate, endDate, timeframe = 1 }) {
      const client = createDbClient(databaseConfig);
      return withDb(client, async (db) => {
        const result = await db.query(
          `
            SELECT security_id,
                   date::date AS date,
                   open_price,
                   high_price,
                   low_price,
                   close_price,
                   volume,
                   timeframe
            FROM price_candles
            WHERE timeframe = $1
              AND date::date BETWEEN $2 AND $3
              AND ($4::int[] IS NULL OR security_id = ANY($4::int[]))
            ORDER BY security_id, date
          `,
          [timeframe, startDate, endDate, securityIds?.length ? securityIds : null]
        );

        return result.rows.map((row) => ({
          ...row,
          date: row.date.toISOString().slice(0, 10)
        }));
      });
    }
  };
}
