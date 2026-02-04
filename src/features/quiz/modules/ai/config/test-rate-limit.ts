import { rateLimiter } from "./rate-limiter";

async function runTest() {
    console.log("Starting Rate Limiter Test...");
    const model = "qwen-3-235b-a22b-instruct-2507";
    const requests = 5;

    // Simulate parallel requests
    console.time("TotalTime");
    const promises = Array.from({ length: requests }).map(async (_, i) => {
        const start = Date.now();
        console.log(`Req ${i} asking for slot...`);
        await rateLimiter.waitForSlot(model);
        const end = Date.now();
        console.log(`Req ${i} granted slot after ${end - start}ms`);
    });

    await Promise.all(promises);
    console.timeEnd("TotalTime");
    console.log("Test Complete!");
}

runTest();
