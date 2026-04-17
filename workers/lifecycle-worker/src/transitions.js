import axios from 'axios';
import pino from 'pino';

const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });

export async function transitionPin(pin, clusterApi, brokerApi) {
  const { id, cid, tier, region, replication } = pin;

  // Logic for Hot -> Warm or Warm -> Cold (Cluster only)
  if (tier === 'hot' || tier === 'warm') {
    log.info({ cid, tier }, 'Moving pin to lower cluster tier');
    try {
      await axios.post(`${clusterApi}/pins/${cid}`, {
        replication_factor_min: replication - 1,
        replication_factor_max: replication,
        region: region,
      }, {
        headers: { Authorization: `Basic ${Buffer.from(process.env.CLUSTER_AUTH ?? 'admin:admin').toString('base64')}` }
      });
      return { success: true, newTier: tier === 'hot' ? 'warm' : 'cold' };
    } catch (err) {
      log.error({ err, cid }, 'Cluster transition failed');
      throw err;
    }
  }

  // Logic for Cold -> Glacier (Filecoin Broker)
  if (tier === 'cold') {
    log.info({ cid }, 'Initiating Filecoin deal for Glacier tier');
    try {
      const dealResponse = await axios.post(`${brokerApi}/deals`, {
        cid,
        size: pin.size_bytes,
        duration: '365d',
        replication: 3,
      });

      const dealId = dealResponse.data.dealId;

      // Poll for seal confirmation (simplified for worker)
      let verified = false;
      for (let i = 0; i < 5; i++) {
        const status = await axios.get(`${brokerApi}/status/${dealId}`);
        if (status.data.status === 'sealed') {
          verified = true;
          break;
        }
        await new Promise(r => setTimeout(r, 30000)); // wait 30s
      }

      if (!verified) throw new Error('Filecoin seal timeout');

      return { success: true, newTier: 'glacier' };
    } catch (err) {
      log.error({ err, cid }, 'Filecoin broker transition failed');
      throw err;
    }
  }

  throw new Error(`Unsupported transition from tier ${tier}`);
}
