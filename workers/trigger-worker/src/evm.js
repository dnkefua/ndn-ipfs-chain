import { ethers } from 'ethers';

export async function evmWatcher({ chain, rpc, triggers, onEvent, log }) {
  const provider = new ethers.JsonRpcProvider(rpc);
  const activeListeners = new Map(); // triggerId -> { filter, listener }

  const extractCid = (log, field) => {
    if (!field) return null;
    // Field format: 'arg0', 'arg1', etc.
    const index = parseInt(field.replace('arg', ''), 10);
    if (isNaN(index)) return null;
    return log.args?.[index];
  };

  const setupListener = (trigger) => {
    const iface = new ethers.Interface([
      `event ${trigger.event}(${trigger.event_signature})`
    ]);

    const filter = {
      address: trigger.contract,
      topics: [iface.getEventTopic(trigger.event)]
    };

    const listener = (log) => {
      const parsedLog = iface.parseLog(log);
      if (!parsedLog) return;

      const cid = extractCid(parsedLog, trigger.cid_field);
      if (cid) {
        onEvent({
          trigger,
          cid,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          extra: { event: trigger.event }
        });
      }
    };

    return { filter, listener };
  };

  return {
    async refresh() {
      const currentIds = new Set(triggers.map(t => t.id));

      // Remove obsolete listeners
      for (const [id, { listener }] of activeListeners) {
        if (!currentIds.has(id)) {
          provider.off(listener);
          activeListeners.delete(id);
        }
      }

      // Add new listeners
      for (const trigger of triggers) {
        if (!activeListeners.has(trigger.id)) {
          try {
            const { filter, listener } = setupListener(trigger);
            provider.on(filter, listener);
            activeListeners.set(trigger.id, { filter, listener });
          } catch (err) {
            log.error({ err, triggerId: trigger.id }, 'failed to setup evm listener');
          }
        }
      }
    },
    async close() {
      provider.removeAllListeners();
    }
  };
}
