import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const ACHIEVEMENTS = [
  { key: "registered",        tier: "bronze", labelCs: "Nový člen",          labelEn: "New Member",          descriptionCs: "Registrace na platformě" },
  { key: "profile_complete",  tier: "bronze", labelCs: "Kompletní profil",    labelEn: "Complete Profile",    descriptionCs: "Vyplněný profil se jménem, telefonem a alespoň jedním dítětem" },
  { key: "child_added",       tier: "bronze", labelCs: "Rodič",               labelEn: "Parent",              descriptionCs: "Přidáno první dítě" },
  { key: "role_committee",    tier: "gold",   labelCs: "Člen výboru",         labelEn: "Committee Member",    descriptionCs: "Aktivní člen školního výboru" },
  { key: "role_teacher",      tier: "silver", labelCs: "Učitel",              labelEn: "Teacher",             descriptionCs: "Aktivní učitel" },
  { key: "idea_first",        tier: "bronze", labelCs: "Nápadník",            labelEn: "Idea Starter",        descriptionCs: "Přidán první nápad" },
  { key: "idea_5",            tier: "silver", labelCs: "Generátor nápadů",    labelEn: "Idea Generator",      descriptionCs: "Přidáno 5 nápadů" },
  { key: "idea_20",           tier: "gold",   labelCs: "Vizionář",            labelEn: "Visionary",           descriptionCs: "Přidáno 20 nápadů" },
  { key: "voter_first",       tier: "bronze", labelCs: "Volič",               labelEn: "First Vote",          descriptionCs: "První hlasování" },
  { key: "voter_10",          tier: "silver", labelCs: "Aktivní volič",       labelEn: "Active Voter",        descriptionCs: "Odhlasováno 10 hlasů" },
  { key: "voter_50",          tier: "gold",   labelCs: "Šampion voleb",       labelEn: "Voting Champion",     descriptionCs: "Odhlasováno 50 hlasů" },
  { key: "comment_first",     tier: "bronze", labelCs: "Komentátor",          labelEn: "Commenter",           descriptionCs: "První komentář" },
  { key: "comment_10",        tier: "silver", labelCs: "Diskutér",            labelEn: "Discusser",           descriptionCs: "Napsáno 10 komentářů" },
  { key: "popular_idea_10",   tier: "silver", labelCs: "Populární nápad",     labelEn: "Popular Idea",        descriptionCs: "Nápad s 10 hlasy" },
  { key: "popular_idea_50",   tier: "gold",   labelCs: "Virální nápad",       labelEn: "Viral Idea",          descriptionCs: "Nápad s 50 hlasy" },
  { key: "task_completed",    tier: "bronze", labelCs: "Dobrovolník",         labelEn: "Volunteer",           descriptionCs: "Splněn první úkol" },
  { key: "task_champion_5",   tier: "silver", labelCs: "Aktivní dobrovolník", labelEn: "Active Volunteer",    descriptionCs: "Splněno 5 úkolů" },
  { key: "task_champion_20",  tier: "gold",   labelCs: "Šampion úkolů",       labelEn: "Task Champion",       descriptionCs: "Splněno 20 úkolů" },
  { key: "best_commenter",    tier: "gold",   labelCs: "Nejlepší komentátor", labelEn: "Best Commenter",      descriptionCs: "Uživatel s nejvíce lajky na komentářích" },
  { key: "early_adopter",     tier: "bronze", labelCs: "Průkopník",           labelEn: "Early Adopter",       descriptionCs: "Registrace do 30 dnů od začátku školního roku" },
];

async function main() {
  for (const badge of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: badge.key },
      update: { labelCs: badge.labelCs, labelEn: badge.labelEn, descriptionCs: badge.descriptionCs, tier: badge.tier },
      create: badge,
    });
  }
  console.log(`Seeded ${ACHIEVEMENTS.length} achievements.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
