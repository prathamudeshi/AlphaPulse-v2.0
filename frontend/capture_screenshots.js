const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, 'public', 'tutorial');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const screenshots = [
    { url: '/dashboard', name: 'holdings.png' },
    { url: '/chat', name: 'buy-sell.png' }, // Reusing chat for multiple for now
    { url: '/chat', name: 'quote.png' },
    { url: '/chat', name: 'recommendations.png' },
    { url: '/goals', name: 'goals.png' },
    { url: '/simulation', name: 'simulation.png' },
    { url: '/playground', name: 'playground.png' },
    { url: '/leaderboard', name: 'leaderboard.png' },
    { url: '/profile', name: 'api-setup.png' },
    { url: '/profile', name: 'bio-threshold.png' },
    { url: '/profile', name: 'whatsapp.png' },
];

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1280, height: 800 }
    });
    const page = await browser.newPage();

    // Set a cookie or local storage if needed for auth, but assuming dev env is accessible or we can login
    // If login is needed, we might need to do that first.
    // Checking if we are redirected to login.

    // Register a new user to ensure access
    console.log('Registering new user...');
    await page.goto(BASE_URL + '/register');

    const randomId = Math.floor(Math.random() * 10000);
    const username = `user${randomId}`;
    const email = `user${randomId}@example.com`;
    const password = 'password123';

    try {
        await page.type('input[placeholder="Choose a username"]', username);
        await page.type('input[placeholder="Enter your email"]', email);
        await page.type('input[placeholder="Create a password"]', password);

        const submitBtn = await page.$('button');
        if (submitBtn) {
            await submitBtn.click();
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
            console.log('Registration successful, logged in as', username);
        }
    } catch (e) {
        console.log('Registration failed:', e.message);
        // Fallback to login if registration fails (e.g. if we are already logged in? unlikely)
    }

    for (const item of screenshots) {
        console.log(`Capturing ${item.name}...`);
        try {
            await page.goto(BASE_URL + item.url, { waitUntil: 'networkidle0' });
            await page.screenshot({ path: path.join(OUTPUT_DIR, item.name) });
        } catch (e) {
            console.error(`Failed to capture ${item.name}:`, e.message);
        }
    }

    await browser.close();
})();
