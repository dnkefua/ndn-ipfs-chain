#!/usr/bin/env node

/**
 * Secrets Generation Utility
 *
 * Generates cryptographically secure random secrets for:
 * - JWT_SECRET (64 chars)
 * - CLUSTER_AUTH (32 chars username + 32 chars password)
 * - API_KEY_PREFIX (16 chars)
 * - Session secrets, encryption keys, etc.
 *
 * Usage:
 *   node scripts/generate-secrets.js
 *   node scripts/generate-secrets.js --output .env
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function generateSecureString(length = 32) {
  return randomBytes(length).toString('base64url').slice(0, length);
}

function generateSecrets() {
  return {
    // JWT Configuration
    JWT_SECRET: generateSecureString(64),
    JWT_EXPIRY: '7d',

    // Cluster Authentication (username:password format for Basic auth)
    CLUSTER_AUTH: `${generateSecureString(32)}:${generateSecureString(32)}`,

    // API Key Configuration
    API_KEY_PREFIX: 'ndn_live_' + generateSecureString(24),
    API_KEY_HASH_SALT: generateSecureString(32),

    // Session & Cookie Secrets
    SESSION_SECRET: generateSecureString(64),
    COOKIE_SECRET: generateSecureString(64),

    // Encryption
    ENCRYPTION_KEY: generateSecureString(32),

    // Database (if using local dev)
    POSTGRES_PASSWORD: generateSecureString(32),

    // Redis (if using local dev)
    REDIS_PASSWORD: generateSecureString(32),

    // Feature flags
    NODE_ENV: 'production',
    LOG_LEVEL: 'info',
    PORT: '3000',

    // Security
    RATE_LIMIT_MAX: '1000',

    // UUID for various purposes
    INSTANCE_ID: randomUUID(),
  };
}

function generateEnvFile(secrets, outputPath) {
  const envContent = `# NDN IPFS Chain - Production Environment Configuration
# Generated: ${new Date().toISOString()}
# IMPORTANT: Keep this file secure. Never commit to version control.

# Node.js Configuration
NODE_ENV=${secrets.NODE_ENV}
PORT=${secrets.PORT}
LOG_LEVEL=${secrets.LOG_LEVEL}

# Security - CRITICAL: These must be unique per deployment
JWT_SECRET=${secrets.JWT_SECRET}
JWT_EXPIRY=${secrets.JWT_EXPIRY}
SESSION_SECRET=${secrets.SESSION_SECRET}
COOKIE_SECRET=${secrets.COOKIE_SECRET}

# IPFS Cluster Authentication
CLUSTER_AUTH=${secrets.CLUSTER_AUTH}

# API Key Configuration
API_KEY_PREFIX=${secrets.API_KEY_PREFIX}
API_KEY_HASH_SALT=${secrets.API_KEY_HASH_SALT}

# Encryption
ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}

# Database Configuration
DATABASE_URL=postgres://postgres:${secrets.POSTGRES_PASSWORD}@localhost:5432/ndnipfs
POSTGRES_PASSWORD=${secrets.POSTGRES_PASSWORD}
PG_POOL_MAX=10
DATABASE_SSL=true

# Redis Configuration
REDIS_URL=redis://:${secrets.REDIS_PASSWORD}@localhost:6379/0
REDIS_PASSWORD=${secrets.REDIS_PASSWORD}

# Rate Limiting
RATE_LIMIT_MAX=${secrets.RATE_LIMIT_MAX}

# Instance Identification
INSTANCE_ID=${secrets.INSTANCE_ID}

# IPFS Configuration
KUBO_API_URL=http://localhost:5001
CLUSTER_API_URL=http://localhost:9094
IPFS_GATEWAY_URL=https://gateway.ndnipfs.link
IPFS_TIMEOUT=30000

# CORS (update with your actual domains)
CORS_ORIGIN=https://app.ndnipfs.com
CORS_CREDENTIALS=true

# Feature Flags
FEATURE_ENCRYPTION=true
FEATURE_FILECOIN_DEALS=true
FEATURE_SMART_CONTRACT_TRIGGERS=true
FEATURE_ANALYTICS=true
FEATURE_BILLING=true

# Tus Resumable Uploads
TUS_TMP=/tmp/ndn-tus

# Stripe (add your actual keys)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_HOT=
STRIPE_PRICE_ID_WARM=
STRIPE_PRICE_ID_COLD=

# RPC Endpoints for Smart Contract Triggers (add your actual keys)
RPC_ETHEREUM=
RPC_POLYGON=
RPC_ARBITRUM=
RPC_BASE=
RPC_OPTIMISM=
RPC_AVALANCHE=
RPC_SOLANA=

# Filecoin (add your actual API keys)
FILECOIN_API_URL=
FILECOIN_API_KEY=

# AWS (for S3 cold storage, add your credentials)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=

# HashiCorp Vault (for secrets management)
VAULT_URL=
VAULT_TOKEN=
VAULT_NAMESPACE=

# Monitoring & Alerting
SENTRY_DSN=
DATADOG_API_KEY=
PAGERDUTY_SERVICE_KEY=

# Email (for notifications)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=noreply@ndnipfs.com
`;

  writeFileSync(outputPath, envContent);
  console.log(`Environment file written to: ${outputPath}`);
}

function main() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  const outputEnv = outputIndex !== -1 ? args[outputIndex + 1] : null;

  console.log('NDN IPFS Chain - Secrets Generator\n');
  console.log('Generating cryptographically secure secrets...\n');

  const secrets = generateSecrets();

  if (outputEnv) {
    const fullPath = outputEnv.startsWith('/')
      ? outputEnv
      : join(process.cwd(), outputEnv);
    generateEnvFile(secrets, fullPath);
    console.log('\nSecrets generated and saved successfully!');
    console.log('\n⚠️  IMPORTANT SECURITY REMINDERS:');
    console.log('   1. Set file permissions: chmod 600 ' + outputEnv);
    console.log('   2. Never commit this file to version control');
    console.log('   3. Back up secrets to a secure location (Vault, AWS Secrets Manager)');
    console.log('   4. Rotate secrets regularly (every 90 days recommended)');
  } else {
    console.log('Generated Secrets:');
    console.log('==================\n');
    for (const [key, value] of Object.entries(secrets)) {
      const masked = value.length > 8
        ? value.slice(0, 4) + '...' + value.slice(-4)
        : value;
      console.log(`${key}=${masked}`);
    }
    console.log('\n\nTo save to a file, run:');
    console.log('  node scripts/generate-secrets.js --output .env.production');
  }
}

main();
