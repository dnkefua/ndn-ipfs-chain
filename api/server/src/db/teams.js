export const teams = ({ sql, one }) => ({
  list(tenantId) {
    return sql(
      `SELECT t.*, COALESCE(json_agg(json_build_object('userId', tm.user_id, 'role', tm.role))
                            FILTER (WHERE tm.user_id IS NOT NULL), '[]') AS members
         FROM teams t LEFT JOIN team_members tm ON tm.team_id = t.id
        WHERE t.tenant_id = $1
        GROUP BY t.id
        ORDER BY t.created_at DESC`, [tenantId]);
  },

  async create(tenantId, { name }) {
    return one(
      `INSERT INTO teams (tenant_id, name) VALUES ($1,$2) RETURNING *`,
      [tenantId, name]);
  },

  addMember(tenantId, teamId, { userId, role }) {
    return sql(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [teamId, userId, role]);
  },
});
