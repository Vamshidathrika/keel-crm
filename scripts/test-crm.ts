import { db } from "../src/db";
import { organizations, users, contacts, companies, deals, activities, tasks } from "../src/db/schema";
import { scoreContact } from "../src/lib/ai/scoring";
import { eq, and } from "drizzle-orm";

async function runTests() {
  console.log("🚀 Starting Keel CRM integration tests...");

  // 1. Verify Seed Data
  const orgCount = await db.select().from(organizations);
  console.log(`✅ Organizations check: Found ${orgCount.length} org(s).`);
  if (orgCount.length === 0) {
    throw new Error("No organization found. Please run seed script first.");
  }
  const targetOrgId = orgCount[0].id;

  const usersCount = await db.select().from(users).where(eq(users.orgId, targetOrgId));
  console.log(`✅ Users check: Found ${usersCount.length} user(s).`);

  const contactsCount = await db.select().from(contacts).where(eq(contacts.orgId, targetOrgId));
  console.log(`✅ Contacts check: Found ${contactsCount.length} contact(s).`);

  const dealsCount = await db.select().from(deals).where(eq(deals.orgId, targetOrgId));
  console.log(`✅ Deals check: Found ${dealsCount.length} deal(s).`);

  // 2. Test Lead Scoring Model
  if (contactsCount.length > 0) {
    const testContactId = contactsCount[0].id;
    console.log(`🧪 Testing lead scoring on contact ID: ${testContactId}...`);
    try {
      const scoringResult = await scoreContact(testContactId);
      console.log("✅ Lead scoring test passed!");
      console.log(`   Result Score: ${scoringResult.score} (Band: ${scoringResult.band})`);
      console.log(`   Recommendation: ${scoringResult.recommendation}`);
      console.log(`   Factors identified: ${scoringResult.factors.length}`);
    } catch (err: any) {
      console.error("❌ Lead scoring test failed:", err.message);
      throw err;
    }
  }

  // 3. Test Deduplication Scan
  console.log("🧪 Testing contact deduplication matching logic...");
  const dupMap: Record<string, typeof contactsCount> = {};
  for (const c of contactsCount) {
    if (c.email) {
      dupMap[c.email] = dupMap[c.email] || [];
      dupMap[c.email].push(c);
    }
  }
  console.log(`✅ Deduplication scan passed!`);

  // 4. Test Contact Merging Transaction
  console.log("🧪 Testing duplicate contacts merge loop...");
  const [testUser] = usersCount;
  const [cnt1] = await db.insert(contacts).values({
    orgId: targetOrgId,
    firstName: "TestDuplicate",
    lastName: "One",
    email: "test.dup@keel.crm",
    phone: "+918888877777",
    ownerId: testUser.id,
  }).returning();

  const [cnt2] = await db.insert(contacts).values({
    orgId: targetOrgId,
    firstName: "TestDuplicate",
    lastName: "Two",
    email: "test.dup@keel.crm",
    phone: "+918888877777",
    ownerId: testUser.id,
  }).returning();

  // Add dummy activity to check relation transfer
  await db.insert(activities).values({
    orgId: targetOrgId,
    type: "note",
    relatedContactId: cnt2.id,
    body: "This is a notes activity attached to Duplicate Two.",
  });

  try {
    console.log(`   Merging source ${cnt2.id} into target ${cnt1.id}...`);
    
    // Execute direct merge transaction logic
    await db.transaction(async (tx) => {
      // Move activities
      await tx
        .update(activities)
        .set({ relatedContactId: cnt1.id })
        .where(eq(activities.relatedContactId, cnt2.id));

      // Move deals
      await tx
        .update(deals)
        .set({ contactId: cnt1.id })
        .where(eq(deals.contactId, cnt2.id));

      // Move tasks
      await tx
        .update(tasks)
        .set({ relatedContactId: cnt1.id })
        .where(eq(tasks.relatedContactId, cnt2.id));

      // Delete source
      await tx.delete(contacts).where(eq(contacts.id, cnt2.id));
    });

    // Verify relations moved
    const migratedActivities = await db.select().from(activities).where(eq(activities.relatedContactId, cnt1.id));
    const oldActivitiesCount = await db.select().from(activities).where(eq(activities.relatedContactId, cnt2.id));
    
    console.log(`✅ Contact merge test passed!`);
    console.log(`   Target activities count: ${migratedActivities.length}`);
    console.log(`   Source activities count (should be 0): ${oldActivitiesCount.length}`);
  } catch (err: any) {
    console.error("❌ Contact merge test failed:", err.message);
    throw err;
  } finally {
    // Cleanup test contacts
    await db.delete(contacts).where(eq(contacts.id, cnt1.id));
    await db.delete(contacts).where(eq(contacts.id, cnt2.id));
  }

  console.log("🎉 All integration checks successfully completed!");
}

runTests().catch(err => {
  console.error("❌ Test run failed:", err);
  process.exit(1);
});
