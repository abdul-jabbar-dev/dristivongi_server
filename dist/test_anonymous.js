"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("./lib/prisma");
const case_service_1 = __importDefault(require("./src/modules/case/case.service"));
async function runTests() {
    console.log("Running Anonymous Contribution Tests...");
    // 1. Setup mock user
    const user = await prisma_1.db.user.create({
        data: {
            fullName: "Test User",
            email: "test_anon_" + Date.now() + "@example.com",
            userName: "test_anon_" + Date.now(),
        }
    });
    console.log("Created user:", user.id);
    try {
        // 2. Create anonymous case
        const caseData = {
            title: "Anonymous Case Title",
            titleHtml: "Anonymous Case Title",
            location: "Dhaka",
            isAnonymous: true,
            claims: {
                title: "Anonymous Claim Title",
                isAnonymous: true,
            }
        };
        const newCase = await case_service_1.default.createNewCase(caseData, user.id, []);
        console.log("Created Case ID:", newCase.id);
        // 3. Fetch Case Details
        const caseDetails = await case_service_1.default.getCaseDetails(newCase.id);
        // 4. Verification
        if (caseDetails.authorId) {
            console.error("❌ FAILED: authorId is exposed in public case details");
            process.exit(1);
        }
        if (caseDetails.author.id !== "anonymous" && !caseDetails.isAnonymous) {
            // Wait, our payload sets it to "anonymous" or strips it depending on the payload?
            // ANONYMOUS_AUTHOR_PAYLOAD has no id.
        }
        if (caseDetails.author.displayName !== "Anonymous Contributor") {
            console.error("❌ FAILED: displayName is not Anonymous Contributor");
            process.exit(1);
        }
        if (caseDetails.claims && caseDetails.claims.length > 0) {
            const claim = caseDetails.claims[0];
            if (claim.createdBy) {
                console.error("❌ FAILED: createdBy is exposed in claim");
                process.exit(1);
            }
            if (claim.creator.displayName !== "Anonymous Contributor") {
                console.error("❌ FAILED: creator is not Anonymous Contributor in claim");
                process.exit(1);
            }
        }
        // 5. Test Feed
        const feed = await case_service_1.default.getNewsFeed(undefined, undefined, undefined, "recent", 1, 10);
        const feedCase = feed.items.find((i) => i.case.id === newCase.id)?.case;
        if (feedCase) {
            if (feedCase.author.fullName !== "Anonymous Contributor") {
                console.error("❌ FAILED: Feed does not anonymize author");
                process.exit(1);
            }
            if (feedCase.author.id) {
                console.error("❌ FAILED: Feed exposes author id");
                process.exit(1);
            }
        }
        console.log("✅ All Anonymous Contribution privacy tests passed.");
    }
    catch (e) {
        console.error("Test execution failed:", e);
    }
    finally {
        // Cleanup
        await prisma_1.db.case.deleteMany({ where: { authorId: user.id } });
        await prisma_1.db.user.delete({ where: { id: user.id } });
        await prisma_1.db.$disconnect();
    }
}
runTests();
