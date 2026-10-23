/**
 * Creates a platform admin account (af-v3-admin F-19): the first one, or a rescue account.
 * The others are created from the admin space itself.
 *
 *   yarn admin:create --username david --name "David R."
 *
 * The password is typed without being shown (or read from ADMIN_PASSWORD, e.g. in CI).
 * MFA is set up at the first sign-in, by scanning the QR code.
 */
import { createInterface } from 'node:readline';

import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/modules/admin/admin-crypto.js';
import { newPassword, username } from '../src/modules/admin/admin.schemas.js';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : undefined;
}

/** Reads a line without echoing it. */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const output = rl as unknown as { _writeToOutput: (s: string) => void };
    let asked = false;
    output._writeToOutput = (s: string) => {
      if (!asked) {
        process.stdout.write(s);
        asked = true;
      }
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main() {
  const name = arg('name')?.trim();
  const parsedUsername = username.safeParse(arg('username') ?? '');
  if (!parsedUsername.success || !name) {
    console.error('Usage : yarn admin:create --username <identifiant> --name "<Nom affiché>"');
    console.error('Identifiant : 3 à 50 caractères, lettres minuscules, chiffres, . _ -');
    process.exit(1);
  }

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await askHidden('Mot de passe (12 caractères minimum) : ');
    const again = await askHidden('Confirmez le mot de passe : ');
    if (password !== again) {
      console.error('Les deux mots de passe sont différents.');
      process.exit(1);
    }
  }
  const parsedPassword = newPassword.safeParse(password);
  if (!parsedPassword.success) {
    console.error('Mot de passe trop court : 12 caractères minimum.');
    process.exit(1);
  }

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO admin_users (username, name, password_hash, must_change_password)
     VALUES ($1, $2, $3, false)
     ON CONFLICT (username) DO NOTHING
     RETURNING id`,
    [parsedUsername.data, name, await hashPassword(parsedPassword.data)],
  );
  if (!rows[0]) {
    console.error(`L’identifiant « ${parsedUsername.data} » existe déjà.`);
    process.exit(1);
  }
  console.log(
    `Admin « ${parsedUsername.data} » créé. À la première connexion, scannez le QR code (MFA).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
