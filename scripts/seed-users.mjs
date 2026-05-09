const apiUrl = process.env.KYC_API_URL ?? 'http://localhost:3001';

const users = [
  {
    name: 'Administrador KYC',
    email: 'admin@kyc.local',
    password: 'Admin123!',
    role: 'admin',
  },
  {
    name: 'Analista KYC',
    email: 'analista@kyc.local',
    password: 'Analista123!',
    role: 'analista',
  },
];

async function createUser(user) {
  const response = await fetch(`${apiUrl}/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });

  const text = await response.text();

  if (response.ok) {
    console.log(`OK ${user.email} creado con rol ${user.role}`);
    return;
  }

  if (/exist|already|registr|duplicate|email/i.test(text)) {
    console.log(`OK ${user.email} ya existe`);
    return;
  }

  throw new Error(
    `No se pudo crear ${user.email}. HTTP ${response.status}: ${text}`,
  );
}

for (const user of users) {
  try {
    await createUser(user);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
