const webdriver = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')
const firefox = require('selenium-webdriver/firefox')
const fs = require('fs');
const path = require('path');
const {minimal_args} = require("../utils");
const {By} = require("selenium-webdriver");

let options = new firefox.Options();
options.set('headless', true)
options.addArguments(
    ...minimal_args
)

class WebDriver {
    constructor(width, height) {
        this.driver = createDriver(width, height)
    }

    async goto(url) {
        await this.driver.get(url)
    }

    async screenshot(filePath) {
        let body = this.driver.findElement(By.name('body'));
        let b64 = await body.takeScreenshot()
        const buffer = Buffer.from(b64, 'base64');
        fs.writeFileSync(path.join(__dirname, filePath), buffer);
    }

    async setViewport({width, height}) {
        const w = await this.driver.executeScript("return document.body.parentNode.scrollWidth")
        const h = await this.driver.executeScript("return document.body.parentNode.scrollHeight")
        console.log(`Viewport: ${w}, ${h}`);
        await this.driver.manage().window().setRect({ width: w, height: h });
        const newSize = await this.driver.manage().window().getRect();
        console.log(`Width: ${newSize.width}, Height: ${newSize.height}`);
    }

    async close() {
        await this.driver.quit()
    }
}


const createDriver = (width, height) => {
        options.addArguments(`--window-size=${width},${height}`)
        return new webdriver.Builder()
            .forBrowser(webdriver.Browser.FIREFOX)
            .usingServer(`${process.env.SELENIUM_URL}/wd/hub`)
            .setChromeOptions(options)
            .build()
    }

/*

;(async function example() {
    let driver = new webdriver.Builder()
        .forBrowser(webdriver.Browser.CHROME)
        .usingServer('http://localhost:4444/wd/hub')
        .setChromeOptions(options)
        .build()
    try {
        await driver.get('https://pechat55.ru/index.php?route=photobook/photobook/renderPage&uid=rquUXUkZuH3rdf1p&page=1&width=4692&height=2346&isFullRender=true')

        let b64 = await driver.takeScreenshot()
        const buffer = Buffer.from(b64, 'base64');
        fs.writeFileSync(path.join(__dirname, 'screenshot.jpg'), buffer);

    } finally {
        await driver.quit()
    }
})()
*/

module.exports = {WebDriver}
