// Placement helper — returns a set of healthy Cluster peer IDs in a region,
// suitable to pass as user_allocations for region-locked pins.
export const regions = ({ sql }) => ({
  peersFor(region, limit = 9) {
    return sql(
      `SELECT peer_id FROM cluster_peers
        WHERE region = $1 AND healthy
        ORDER BY disk_free_gb DESC NULLS LAST
        LIMIT $2`, [region, limit])
      .then((rows) => rows.map((r) => r.peer_id));
  },

  register(peer) {
    return sql(
      `INSERT INTO cluster_peers (peer_id, region, az, carrier, disk_free_gb)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (peer_id) DO UPDATE SET
         region = EXCLUDED.region, az = EXCLUDED.az,
         carrier = EXCLUDED.carrier, disk_free_gb = EXCLUDED.disk_free_gb,
         last_seen = now(), healthy = true`,
      [peer.peerId, peer.region, peer.az, peer.carrier, peer.diskFreeGb]);
  },
});
