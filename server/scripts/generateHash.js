const readline = require('readline');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

async function printHash(plainPassword) {
  if (!plainPassword) {
    console.error('Error: Password cannot be empty.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  console.log('\nGenerated bcrypt hash:');
  console.log(hash);
  console.log('\nExample SQL update:');
  console.log(`UPDATE panchayaths SET password = '${hash}' WHERE username = 'kondapalli';`);
}

const argPassword = process.argv[2];

if (argPassword !== undefined) {
  printHash(argPassword);
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter password to hash: ', async (answer) => {
    rl.close();
    await printHash(answer);
  });
}

