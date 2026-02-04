// Implemented locally to avoid import issues with Supabase in a standalone script
function extractPrerequisites(
    chunkMetadata: {
        concept_map?: { baslik: string; prerequisites: string[] }[];
    } | null,
    targetConcept: string,
): string[] {
    if (!chunkMetadata || !chunkMetadata.concept_map) {
        return [];
    }

    const conceptMap = chunkMetadata.concept_map;
    const targetItem = conceptMap.find(
        (c) =>
            c.baslik.trim().toLowerCase() ===
                targetConcept.trim().toLowerCase(),
    );

    return targetItem?.prerequisites || [];
}

// Mock Data
const mockMetadata = {
    concept_map: [
        {
            baslik: "Advanced Topic",
            prerequisites: ["Intermediate Topic"],
        },
        {
            baslik: "Intermediate Topic",
            prerequisites: ["Basic Topic"],
        },
        {
            baslik: "Basic Topic",
            prerequisites: [],
        },
    ],
};

console.log("--- Testing Prerequisite Extraction ---");

const t1 = extractPrerequisites(mockMetadata, "Advanced Topic");
console.log(`Prereqs for Advanced Topic: ${JSON.stringify(t1)}`);
if (t1.includes("Intermediate Topic")) console.log("PASS");
else console.log("FAIL");

const t2 = extractPrerequisites(mockMetadata, "Intermediate Topic");
console.log(`Prereqs for Intermediate Topic: ${JSON.stringify(t2)}`);
if (t2.includes("Basic Topic")) console.log("PASS");
else console.log("FAIL");

const t3 = extractPrerequisites(mockMetadata, "Basic Topic");
console.log(`Prereqs for Basic Topic: ${JSON.stringify(t3)}`);
if (t3.length === 0) console.log("PASS");
else console.log("FAIL");

const t4 = extractPrerequisites(mockMetadata, "Unknown Topic");
console.log(`Prereqs for Unknown Topic: ${JSON.stringify(t4)}`);
if (t4.length === 0) console.log("PASS");
else console.log("FAIL");
