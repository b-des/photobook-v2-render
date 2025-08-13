const puppeteer = require("puppeteer-core");
const {Browser} = require("./browser");

/*let browser;
(async () => {
    browser = await Browser.createInstance("randomuid21");
    console.log(browser);
})();*/

const cacheImages = async (images) => {
    let browser = await Browser.createInstance("randomuid21");
    console.log('Caching images: ', images.length)
    const page = await browser.createPage()

    console.time('Cache images')
    for (const image of images) {
        await page.goto(image)
    }
    console.timeEnd('Cache images')
    await page.close()
    await browser.close()
}

module.exports = {
    cacheImages
}