import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  // Seed agency
  const agency = await db.agency.upsert({
    where: { slug: "seed-studios" },
    update: {},
    create: {
      name: "Seed Studios",
      slug: "seed-studios",
    },
  })

  // Seed demo user
  await db.user.upsert({
    where: { email: "demo@seedstudios.ai" },
    update: {},
    create: {
      email: "demo@seedstudios.ai",
      name: "Demo User",
      role: "ADMIN",
      agencyId: agency.id,
    },
  })

  // Seed demo client
  await db.client.upsert({
    where: { agencyId_slug: { agencyId: agency.id, slug: "demo-brand" } },
    update: {},
    create: {
      name: "Demo Brand",
      slug: "demo-brand",
      agencyId: agency.id,
      targetLanguages: ["es", "fr", "de", "it"],
      offensiveFilter: true,
      toneOfVoice: {
        formality: "semi-formal",
        personality: ["bold", "energetic", "direct"],
        keywords: ["innovative", "trusted", "human"],
        forbidden_words: ["cheap", "basic", "simple"],
        examples: [],
      },
      audienceProfile: {
        demographics: { age: "25-45", gender: "all", location: "urban" },
        psychographics: ["ambitious", "digitally native", "quality-conscious"],
        language_preferences: ["contemporary", "confident", "not overly formal"],
      },
    },
  })

  console.log("✓ Seed complete")
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
