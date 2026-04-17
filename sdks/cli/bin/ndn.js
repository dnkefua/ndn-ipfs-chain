#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { NDNClient } from '@ndnanalytics/ipfs';
import ora from 'ora';
import chalk from 'chalk';

const CONFIG = join(homedir(), '.ndn', 'config.json');

function loadClient() {
  let apiKey = process.env.NDN_API_KEY;
  let baseUrl = process.env.NDN_BASE_URL;
  if (!apiKey && existsSync(CONFIG)) {
    const cfg = JSON.parse(readFileSync(CONFIG, 'utf8'));
    apiKey = cfg.apiKey;
    baseUrl ??= cfg.baseUrl;
  }
  if (!apiKey) {
    console.error(chalk.red('No API key. Run `ndn auth login --api-key …` or set NDN_API_KEY.'));
    process.exit(1);
  }
  return new NDNClient({ apiKey, baseUrl });
}

const program = new Command();
program.name('ndn').description('NDN IPFS Chain CLI').version('1.0.0');

program
  .command('auth')
  .argument('<action>', 'login | logout')
  .option('--api-key <key>')
  .option('--base-url <url>')
  .action((action, opts) => {
    if (action === 'login') {
      mkdirSync(join(homedir(), '.ndn'), { recursive: true });
      writeFileSync(CONFIG, JSON.stringify({ apiKey: opts.apiKey, baseUrl: opts.baseUrl }, null, 2), { mode: 0o600 });
      console.log(chalk.green(`Saved credentials to ${CONFIG}`));
    } else {
      if (existsSync(CONFIG)) require('node:fs').unlinkSync(CONFIG);
      console.log(chalk.green('Logged out.'));
    }
  });

program
  .command('pin <file>')
  .option('--name <n>')
  .option('--region <r>')
  .option('--replication <n>', '', '3')
  .option('--encrypt')
  .option('--lifecycle <name>')
  .action(async (file, opts) => {
    const spin = ora(`Pinning ${file}`).start();
    try {
      const ipfs = loadClient();
      const bytes = readFileSync(file);
      const pin = await ipfs.pin(bytes, {
        name: opts.name ?? file,
        region: opts.region,
        replication: Number(opts.replication),
        encryption: !!opts.encrypt,
        lifecycle: opts.lifecycle,
      });
      spin.succeed(`${chalk.green('pinned')} ${pin.cid}`);
      console.log(chalk.dim(`  gateway: ${ipfs.gatewayUrl}/${pin.cid}`));
    } catch (err) {
      spin.fail(err.message);
      process.exit(1);
    }
  });

program
  .command('get <cid>')
  .option('-o, --output <path>')
  .option('--verify')
  .action(async (cid, opts) => {
    const ipfs = loadClient();
    const bytes = await ipfs.get(cid, { verify: !!opts.verify });
    if (opts.output) {
      writeFileSync(opts.output, Buffer.from(bytes));
      console.log(chalk.green(`wrote ${bytes.length} bytes → ${opts.output}`));
    } else {
      process.stdout.write(Buffer.from(bytes));
    }
  });

program
  .command('ls')
  .option('--status <s>')
  .option('--limit <n>', '', '100')
  .action(async (opts) => {
    const ipfs = loadClient();
    const page = await ipfs.list({ status: opts.status, limit: Number(opts.limit) });
    console.log(chalk.bold(`Pins (${page.count})`));
    for (const p of page.results) {
      console.log(`  ${chalk.cyan(p.cid.slice(0, 16) + '…')}  ${p.status.padEnd(8)}  ${p.name ?? ''}`);
    }
  });

program
  .command('unpin <pinId>')
  .action(async (pinId) => {
    const ipfs = loadClient();
    await ipfs.unpin(pinId);
    console.log(chalk.yellow(`unpinned ${pinId}`));
  });

program.parseAsync();
