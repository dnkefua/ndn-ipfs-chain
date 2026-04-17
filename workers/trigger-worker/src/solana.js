import { Connection } from '@solana/web3.js';

export async function solanaWatcher({ rpc, triggers, onEvent, log }) {
  const connection = new Connection(rpc, 'confirmed');
  let subscriptionId = null;
  let currentTriggers = [];

  const handleLog = async (signature, context) => {
    try {
      const tx = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });
      if (!tx) return;

      for (const trigger of currentTriggers) {
        // Check if the programId involved in the tx matches the trigger
        const involvesProgram = tx.transaction.message.accountKeys.some(
          key => key.pubkey.toBase58() === trigger.contract
        );
        if (!involvesProgram) continue;

        // Extract CID from logs or account data based on cid_field (regex/index)
        const logMessages = tx.meta?.logMessages || [];
        let cid = null;

        // If cid_field is a regex, test against logs
        if (trigger.cid_field && trigger.cid_field.startsWith('/') && trigger.cid_field.endsWith('/')) {
          const regex = new RegExp(trigger.cid_field.slice(1, -1));
          for (const msg of logMessages) {
            const match = msg.match(regex);
            if (match) {
              cid = match[1] || match[0];
              break;
            }
          }
        } else {
          // Fallback: search logs for common IPFS CID patterns
          for (const msg of logMessages) {
            const cidMatch = msg.match(/bafy[a-zA-Z0-9]+/);
            if (cidMatch) {
              cid = cidMatch[0];
              break;
            }
          }
        }

        if (cid) {
          onEvent({
            trigger,
            cid,
            txHash: signature,
            blockNumber: tx.slot,
            extra: { programId: trigger.contract }
          });
        }
      }
    } catch (err) {
      log.error({ err, signature }, 'solana log processing failed');
    }
  };

  return {
    async refresh() {
      currentTriggers = [...triggers];
      if (!subscriptionId) {
        // Subscribe to all logs if we have triggers, then filter locally
        // In a high-scale env, we'd use a more specific filter if the RPC supports it
        subscriptionId = connection.onLogs(
          {},
          (sig, ctx) => handleLog(sig, ctx),
          'confirmed'
        );
      }
    },
    async close() {
      if (subscriptionId) {
        await connection.removeProgramAccountListener(subscriptionId);
      }
    }
  };
}
