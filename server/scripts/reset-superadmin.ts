import http from 'http';
import fs from 'fs';
import readline from 'readline';
import dotenv from 'dotenv';
import {
  getDatabaseUrl,
  initializeDatabase,
  getExistingSuperAdminSummary,
  resetSuperAdminPasswordInDb
} from '../db.ts';

dotenv.config();

const OWNER_SOCKET_PATH = '/tmp/mela-owner-reset.sock';
const OWNER_TOKEN_PATH = '/tmp/mela-owner-reset.token';

function socketRequest(method: 'GET' | 'POST', pathUrl: string, payload?: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(OWNER_SOCKET_PATH) || !fs.existsSync(OWNER_TOKEN_PATH)) {
      reject(new Error('Local owner recovery socket is unavailable. Start the server or provide DATABASE_URL in .env.'));
      return;
    }

    const token = fs.readFileSync(OWNER_TOKEN_PATH, 'utf8').trim();
    const body = payload ? JSON.stringify(payload) : undefined;

    const req = http.request(
      {
        socketPath: OWNER_SOCKET_PATH,
        path: pathUrl,
        method,
        headers: {
          'x-owner-token': token,
          ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {})
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, data: JSON.parse(raw || '{}') });
          } catch {
            resolve({ status: res.statusCode || 500, data: { error: raw } });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function promptLine(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
      return;
    }

    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let value = '';
    const onData = (ch: string) => {
      if (ch === '\r' || ch === '\n' || ch === '\u0004') {
        stdin.setRawMode(Boolean(wasRaw));
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(value);
      } else if (ch === '\u0003') {
        stdin.setRawMode(Boolean(wasRaw));
        process.stdout.write('\nCancelled.\n');
        process.exit(1);
      } else if (ch === '\u007f' || ch === '\b') {
        if (value.length > 0) value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };

    stdin.on('data', onData);
  });
}

async function main() {
  const useDirectDb = Boolean(getDatabaseUrl());

  if (useDirectDb) {
    const init = await initializeDatabase();
    if (!init.success) {
      throw new Error(init.message);
    }
  }

  const summary = useDirectDb
    ? await getExistingSuperAdminSummary()
    : (await socketRequest('GET', '/owner/superadmin')).data?.account;

  if (!summary) {
    throw new Error('No existing Super Admin account found in Neon PostgreSQL.');
  }

  console.log('\n=== Mela Market — Private Owner Super Admin Recovery ===');
  console.log(`Existing Super Admin ID   : ${summary.id}`);
  console.log(`Existing Super Admin Name : ${summary.fullName}`);
  console.log(`Existing Super Admin Email: ${summary.email}`);
  console.log(`Role                      : ${summary.dbRole} (${summary.roleName})\n`);

  let newPassword = process.env.NEW_SUPERADMIN_PASSWORD || '';
  let expectedEmail = process.env.SUPERADMIN_CONFIRM_EMAIL || '';

  if (!newPassword) {
    expectedEmail = await promptLine(`Confirm Super Admin email (${summary.email}): `);
    if (!expectedEmail) expectedEmail = summary.email;
    if (expectedEmail.toLowerCase() !== summary.email.toLowerCase()) {
      throw new Error('Entered email does not match the existing Super Admin account.');
    }

    newPassword = await promptHidden('Enter new Super Admin password (min 8 chars, hidden): ');
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const confirm = await promptHidden('Confirm new Super Admin password (hidden): ');
    if (newPassword !== confirm) {
      throw new Error('Passwords do not match.');
    }
  } else {
    expectedEmail = expectedEmail || summary.email;
  }

  let updated: any;
  if (useDirectDb) {
    updated = await resetSuperAdminPasswordInDb(newPassword, expectedEmail);
  } else {
    const res = await socketRequest('POST', '/owner/reset-superadmin', {
      expectedEmail,
      newPassword
    });
    if (res.status !== 200 || !res.data?.success) {
      throw new Error(res.data?.error || 'Failed to update Super Admin password.');
    }
    updated = res.data.account;
  }

  console.log('\nSuper Admin password updated securely in Neon PostgreSQL.');
  console.log(`Account ID : ${updated.id}`);
  console.log(`Login Email: ${updated.email}`);
  console.log('You can now sign in with this email and your new password.\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nError:', err?.message || err);
    process.exit(1);
  });
