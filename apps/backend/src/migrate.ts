import { AppDataSource } from './data-source';

// Applies pending migrations and exits; Compose runs it as the db-init step.
async function main(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const applied = await AppDataSource.runMigrations({ transaction: 'each' });
    console.log(applied.length ? `Applied ${applied.map((m) => m.name).join(', ')}` : 'Schema is up to date');
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
