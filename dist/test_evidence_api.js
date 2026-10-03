"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function testApi() {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtdXF1a3VnazAwMDA3aGczcGs4OGRuejAiLCJlbWFpbCI6ImFiZHVsLmphYmJhci5kZXZAZ21haWwuY29tIiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTc5MDk0MDk1NiwiZXhwIjoxNzkwOTQ0NTU2fQ.y4ZpA8vS2C6Z4sF8v5_eF9Wf2k5ZkZ1LhKx2UqV5N9A";
    const caseId = "cmuqulfmi00047hg3ncgz2l5m";
    const claimId = "cmuqulfq100057hg3p7a4up82";
    const payload = {
        title: "Test Evidence Claim",
        evidence: [{ title: "Ev 1", type: "IMAGE", relationship: "SUPPORTS" }],
        sources: [{ title: "Src 1", sourceLocation: "", sourceDate: "", externalSourceType: "সংবাদ", externalSourceName: "Src 1", externalLinks: [], relationship: "SUPPORTS" }]
    };
    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));
    // Not appending any file for this test
    const response = await fetch(`http://localhost:5000/api/v1/case/${caseId}/create_claim`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    const responseText = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", responseText);
}
testApi().catch(console.error);
