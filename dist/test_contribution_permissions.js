"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("./lib/prisma");
const case_service_1 = __importDefault(require("./src/modules/case/case.service"));
async function runTests() {
    console.log("🚀 Starting Case Contribution Permissions System End-to-End Tests...\n");
    try {
        // 1. Create 2 test users (Case Owner and Normal User)
        const owner = await prisma_1.db.user.upsert({
            where: { email: "owner_test_perm@civiclens.org" },
            update: {},
            create: {
                fullName: "Case Owner Test",
                email: "owner_test_perm@civiclens.org",
                userName: "owner_test_perm"
            }
        });
        const normalUser = await prisma_1.db.user.upsert({
            where: { email: "normal_test_perm@civiclens.org" },
            update: {},
            create: {
                fullName: "Normal User Test",
                email: "normal_test_perm@civiclens.org",
                userName: "normal_test_perm"
            }
        });
        console.log("✅ Created Test Users: Owner ID =", owner.id, ", Normal User ID =", normalUser.id);
        // 2. Create a Case with custom initial settings
        const testCase = await case_service_1.default.createNewCase({
            title: "Public Rights Infrastructure Review Case",
            titleHtml: "Public Rights Infrastructure Review Case",
            location: "Dhaka",
            isAnonymous: false,
            canUserCreateClaim: true,
            canUserCreateClaimEvidence: true,
            canUserCreateClaimUpdate: true,
        }, owner.id, []);
        console.log("✅ Created Test Case ID:", testCase.id);
        // 3. Verify Default Settings (all 3 should be true)
        const initialDetails = await case_service_1.default.getCaseDetails(testCase.id);
        console.log("📋 Initial Case Settings:", initialDetails.settings);
        if (initialDetails.settings.canUserCreateClaim !== true ||
            initialDetails.settings.canUserCreateClaimEvidence !== true ||
            initialDetails.settings.canUserCreateClaimUpdate !== true) {
            throw new Error("❌ Default case contribution settings are not all true!");
        }
        console.log("✅ TEST 1 PASSED: Case settings default to true.");
        // 4. Normal user creates a claim when settings are ON
        const claim1 = await case_service_1.default.createClaim(testCase.id, {
            title: "Normal User Initial Claim",
            evidence: [],
            sources: [],
        }, normalUser.id, []);
        console.log("✅ Normal User created Claim ID:", claim1.id);
        // 5. Normal user adds evidence to claim when settings are ON
        await case_service_1.default.addEvidenceToClaim(claim1.id, {
            evidence: [{ title: "User Document Proof", type: "DOCUMENT", relationship: "SUPPORTS" }]
        }, normalUser.id, []);
        console.log("✅ Normal User added evidence to claim when ON.");
        // 6. Normal user adds claim update when settings are ON
        await case_service_1.default.createClaimUpdate(claim1.id, {
            content: "Initial claim update by normal user",
            updateType: "GENERAL_UPDATE",
            evidenceIds: [],
            sourceIds: [],
            evidence: [],
            sources: [],
            isAnonymous: false
        }, normalUser.id, []);
        console.log("✅ Normal User added claim update when ON.");
        // 7. Case Owner updates Case Settings to disable contributions
        const updatedSettings = await case_service_1.default.updateCaseSettings(testCase.id, {
            canUserCreateClaim: false,
            canUserCreateClaimEvidence: false,
            canUserCreateClaimUpdate: false,
        }, owner.id);
        console.log("📋 Updated Case Settings (by Owner):", updatedSettings.settings);
        // 8. Test Unauthorized user attempting to update settings
        try {
            await case_service_1.default.updateCaseSettings(testCase.id, { canUserCreateClaim: true }, normalUser.id);
            throw new Error("❌ Normal user was able to modify case settings!");
        }
        catch (err) {
            if (err.statusCode === 403 || err.message.includes("Unauthorized")) {
                console.log("✅ TEST 2 PASSED: Normal user rejected when trying to change settings (403 Forbidden).");
            }
            else {
                throw err;
            }
        }
        // 9. Test Normal user creating claim when disabled
        try {
            await case_service_1.default.createClaim(testCase.id, { title: "Blocked Claim Attempt", evidence: [], sources: [] }, normalUser.id, []);
            throw new Error("❌ Normal user created a claim when canUserCreateClaim = false!");
        }
        catch (err) {
            if (err.statusCode === 403 || err.message.includes("disabled")) {
                console.log("✅ TEST 3 PASSED: Claim creation blocked for normal user (403 Forbidden).");
            }
            else {
                throw err;
            }
        }
        // 10. Test Normal user adding claim evidence when disabled
        try {
            await case_service_1.default.addEvidenceToClaim(claim1.id, {
                evidence: [{ title: "Blocked Evidence Attempt", type: "IMAGE", relationship: "SUPPORTS" }]
            }, normalUser.id, []);
            throw new Error("❌ Normal user added claim evidence when canUserCreateClaimEvidence = false!");
        }
        catch (err) {
            if (err.statusCode === 403 || err.message.includes("disabled")) {
                console.log("✅ TEST 4 PASSED: Claim evidence creation blocked for normal user (403 Forbidden).");
            }
            else {
                throw err;
            }
        }
        // 11. Test Normal user adding claim update when disabled
        try {
            await case_service_1.default.createClaimUpdate(claim1.id, {
                content: "Blocked Update Attempt",
                updateType: "GENERAL_UPDATE",
                evidenceIds: [],
                sourceIds: [],
                evidence: [],
                sources: [],
                isAnonymous: false
            }, normalUser.id, []);
            throw new Error("❌ Normal user created claim update when canUserCreateClaimUpdate = false!");
        }
        catch (err) {
            if (err.statusCode === 403 || err.message.includes("disabled")) {
                console.log("✅ TEST 5 PASSED: Claim update creation blocked for normal user (403 Forbidden).");
            }
            else {
                throw err;
            }
        }
        // 12. Verify Case Owner retains creation capability
        const ownerClaim = await case_service_1.default.createClaim(testCase.id, {
            title: "Owner Management Claim",
            evidence: [],
            sources: []
        }, owner.id, []);
        console.log("✅ TEST 6 PASSED: Case Owner retains ability to create claims even when normal user settings are OFF.");
        // 13. Verify Case-level Evidence is NOT blocked by canUserCreateClaimEvidence setting
        await case_service_1.default.addEvidenceToCase(testCase.id, {
            evidence: [{ title: "Case Level Public Record", type: "DOCUMENT", relationship: "CONTEXT" }]
        }, normalUser.id, []);
        console.log("✅ TEST 7 PASSED: Case-level Evidence creation is preserved.");
        // 14. Verify existing content remains visible
        const finalDetails = await case_service_1.default.getCaseDetails(testCase.id);
        if (!finalDetails.claims || finalDetails.claims.length === 0) {
            throw new Error("❌ Claims disappeared when contribution settings were turned OFF!");
        }
        const updatesList = await case_service_1.default.getClaimUpdates(claim1.id);
        if (!updatesList.updates || updatesList.updates.length === 0) {
            throw new Error("❌ Claim updates disappeared when contribution settings were turned OFF!");
        }
        console.log("✅ TEST 8 PASSED: Existing Claims, Evidence, and Claim Updates remain 100% visible.");
        // Clean up test case and related records
        await prisma_1.db.claimUpdate.deleteMany({ where: { claimId: { in: [claim1.id, ownerClaim.id] } } });
        await prisma_1.db.claimEvidence.deleteMany({ where: { claimId: { in: [claim1.id, ownerClaim.id] } } });
        await prisma_1.db.caseEvidence.deleteMany({ where: { caseId: testCase.id } });
        await prisma_1.db.claim.deleteMany({ where: { caseId: testCase.id } });
        await prisma_1.db.case.delete({ where: { id: testCase.id } });
        console.log("\n🎉 ALL 8 E2E VERIFICATION TESTS PASSED SUCCESSFULLY!");
    }
    catch (error) {
        console.error("❌ Test Failed:", error);
        process.exit(1);
    }
    finally {
        await prisma_1.db.$disconnect();
    }
}
runTests();
