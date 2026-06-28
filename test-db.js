const { PrismaClient } = require('./generated-client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://controlbanquete:Control321***@72.61.11.171:5432/control-banquete?schema=public&sslmode=disable"
    }
  }
});

async function test() {
  try {
    await prisma.$connect();
    console.log('CONNECTED TO PUBLIC IP');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
test();
