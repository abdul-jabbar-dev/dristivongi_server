"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const case_service_1 = __importDefault(require("./src/modules/case/case.service"));
const prisma_1 = require("./lib/prisma");
async function runTests() {
    console.log("=== RUNNING CLAIM UPDATES BACKEND TESTS ===");
    try {
        // 1. Get or create test user and case
        const user = await prisma_1.db.user.findFirst();
        if (!user) {
            console.log("No user found in DB to test!");
            return;
        }
        const testCase = await prisma_1.db.case.findFirst({
            include: { claims: true }
        });
        if (!testCase || testCase.claims.length === 0) {
            console.log("No case or claim found in DB to test!");
            return;
        }
        const targetClaim = testCase.claims[0];
        const authorId = targetClaim.createdBy;
        console.log("Testing with Claim ID:", targetClaim.id, "Author:", authorId);
        // 2. Check permissions endpoint service function
        const permResult = await case_service_1.default.getClaimUpdatePermissions(targetClaim.id, authorId);
        console.log("Permission check result:", permResult);
        // 3. Post a Claim Update
        const updatePayload = {
            content: "Automated test update: Project inspection completed successfully.",
            updateType: "STATE_CHANGED",
            newState: "PARTIALLY_SUPPORTED",
            isAnonymous: true,
            evidence: [
                {
                    title: "Inspection Document PDF",
                    type: "DOCUMENT",
                    relationship: "SUPPORTS",
                    isAnonymous: true
                }
            ]
        };
        const newUpdate = await case_service_1.default.createClaimUpdate(targetClaim.id, updatePayload, authorId);
        console.log("Created Update successfully:");
        console.log("- ID:", newUpdate.id);
        console.log("- Content:", newUpdate.content);
        console.log("- New State:", newUpdate.newState);
        console.log("- Author (Sanitized):", newUpdate.author);
        // 4. Verify Claim currentState was updated
        const updatedClaim = await prisma_1.db.claim.findUnique({ where: { id: targetClaim.id } });
        console.log("Updated Claim currentState:", updatedClaim?.currentState);
        if (updatedClaim?.currentState !== "PARTIALLY_SUPPORTED") {
            throw new Error("Failed: Claim currentState was not updated in transaction!");
        }
        // 5. Fetch Paginated updates
        const updatesResult = await case_service_1.default.getClaimUpdates(targetClaim.id, 10);
        console.log("Fetched Updates timeline:");
        console.log("- Total Count:", updatesResult.totalCount);
        console.log("- Current State:", updatesResult.currentState);
        console.log("- Top Update Content:", updatesResult.updates[0]?.content);
        console.log("- Top Update Author Name:", updatesResult.updates[0]?.author?.fullName);
        if (updatesResult.updates[0]?.author?.fullName !== "Anonymous Contributor") {
            throw new Error("Failed: Anonymous author identity was not masked!");
        }
        console.log("=== ALL CLAIM UPDATE BACKEND TESTS PASSED ===");
    }
    catch (err) {
        console.error("TEST FAILED:", err);
        process.exit(1);
    }
    finally {
        await prisma_1.db.$disconnect();
    }
}
runTests();
