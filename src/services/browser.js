const path = require('path');
const puppeteer = require("puppeteer-core");
const fs = require('fs');

const {minimal_args} = require("../utils");

const puppeteerCacheDir = '/tmp/puppeteer/cache';
const BROWSER_TIMEOUT = 5 * 60 * 1000;

class Browser {

    constructor(browser, page, uid) {
        this.browser = browser;
        this.page = page;
        console.log('Browser created with uid: ' + uid)
    }

    static async createInstance(uid) {
        console.log('Creating browser instance with uid: ' + uid)
        const userDataDir = path.join(puppeteerCacheDir, uid);
        // if (fs.existsSync(userDataDir)) {
        //     await fs.rm(userDataDir, {recursive: true}, (e) => {
        //         console.log(`Removed ${userDataDir} with error: ${e}`);
        //     });
        // }
        let width = 1000;
        let height = 1000;
        const options = {
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            protocolTimeout: parseInt(process.env.PUPPETEER_PROTOCOL_TIMEOUT) || 30000,
            headless: true,
            ignoreHTTPSErrors: true,
            args: [...minimal_args, `--window-size=${width},${height}`],
            dumpio: false,
            userDataDir: userDataDir,
            defaultViewport: {
                width: width,
                height: height
            }
        };
        let browser;
        try {
            browser = await puppeteer.launch(options)
        } catch (e) {
            console.log(`Error while launching browser: ${e}, trying to remove ${userDataDir} and launch again`);
            if (fs.existsSync(userDataDir)) {
                await fs.rm(userDataDir, {recursive: true}, (e) => {
                    console.log(`Removed ${userDataDir} with error: ${e}`);
                });
            }
            browser = await puppeteer.launch(options)
        }

        let page = await browser.newPage();
        page.on('console', msg => {
            const message = msg.text();
            if (message.startsWith('COVER_EXTRA:')) {
                let coverExtraWidth = parseInt(msg.text().replace('COVER_EXTRA:', '') || 0);
                console.log(`Cover extra width: ${coverExtraWidth}`);
                this.prototype.setCoverExtraWidth(coverExtraWidth);
            }
        });
        return new Browser(browser, page, uid);
    }

    async createPage(uid) {
        return await Page.createPage(this, uid)
    }

    setCoverExtraWidth(width) {
        this.coverExtraWidth = width;
    }

    getCoverExtraWidth() {
        return this.coverExtraWidth;
    }

    async goto(url) {
        console.log(`Going to ${url}`)
        let start = Date.now();
        this.coverExtraWidth = 0;
        await this.page.goto(url,
            {
                timeout: BROWSER_TIMEOUT,
                waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2']
            })
        let end = Date.now();
        console.log(`Page has been loaded in ${(end - start) / 1000} seconds`);
    }

    async screenshot(filePath) {
        let start = Date.now();
        await this.page.screenshot({
            path: filePath,
            type: 'jpeg',
            quality: 100,
            fullPage: true
        });
        let end = Date.now();
        console.log(`Screenshot has been created on path: ${filePath} in ${(end - start) / 1000} seconds`);
    }

    async setViewport({width, height}) {
        await this.page.setViewport({
            width: width + this.coverExtraWidth,
            height: height
        });
        console.log(`Viewport: ${width + this.coverExtraWidth}, ${height}`);
    }

    async close() {
        await this.page.close()
        await this.browser.close()
        console.log('Browser closed')
    }
}

class Page {
    constructor(browser, page, uid) {
        this.browser = browser;
        this.page = page;
        this.uid = uid;
    }

    static async createPage(browser, uid) {
        let page = await browser.browser.newPage();
        const instance = new Page(browser, page, uid);
        page.on('console', msg => {
            const message = msg.text();
            if (message.startsWith('COVER_EXTRA:')) {
                let coverExtraWidth = parseInt(msg.text().replace('COVER_EXTRA:', '') || 0);
                console.log(`Cover extra width: ${coverExtraWidth}`);
                instance.setCoverExtraWidth(coverExtraWidth);
            }
        });

        return instance;
    }

    setCoverExtraWidth(width) {
        this.coverExtraWidth = width;
    }

    getCoverExtraWidth() {
        return this.coverExtraWidth;
    }

    async getDOM(url) {
        await this.page.goto(url,
            {
                timeout: BROWSER_TIMEOUT,
                waitUntil: ['domcontentloaded']

            })

        // Evaluate the page context to get the innerHTML of the element
        return await this.page.evaluate((id) => {
            const element = document.getElementById(id);
            return element ? element.innerHTML : null; // Return innerHTML or null if element not found
        }, "book-content")
    }

    async goto(url) {
        console.log(`Going to ${url}`)
        let start = Date.now();
        this.coverExtraWidth = 0;
        await this.page.goto(url,
            {
                timeout: BROWSER_TIMEOUT,
                waitUntil: ['load']
            })
        let end = Date.now();
        console.log(`Page has been loaded in ${(end - start) / 1000} seconds`);
    }

    async screenshot(filePath) {
        let start = Date.now();
        await this.page.screenshot({
            path: filePath,
            type: 'jpeg',
            quality: 100,
            fullPage: true
        });
        let end = Date.now();
        console.log(`Screenshot has been created on path: ${filePath} in ${(end - start) / 1000} seconds`);
    }

    async setViewport({width, height}) {
        await this.page.setViewport({
            width: width + this.coverExtraWidth,
            height: height
        });
        console.log(`Viewport: ${width + this.coverExtraWidth}(where extra width is: ${this.coverExtraWidth}), ${height}`);
    }

    async close() {
        await this.page.close()
        console.log('Page closed')
    }
}

module.exports = {Browser}
