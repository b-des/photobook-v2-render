const placeholdify = require('placeholdify');
const fs = require('fs');
const {Image} = require('image-js');
const path = require('path');
const socketService = require("./socket.service");
const {Browser} = require("./browser");
const {createCoverPages, createPages, bendFirstPageValve, bendSecondLastPageValve, deleteTmpFiles, pageExists} = require("./image");
const {existAndEquals, saveImage} = require("./hash.service");

const renderPage = 'https://{0}/index.php?route=photobook/photobook/renderPage&uid={1}&page={2}&width={3}&height={4}&isFullRender={5}';
const domains = fs.readFileSync(process.env.DOMAINS_DICT_PATH || 'domains.json');
const domainsMap = JSON.parse(domains);

let browser;
Browser.createInstance('browser-1').then(b => {
    browser = b;
})


/**
 * Render full pages
 *
 * @param domain
 * @param uid
 * @param totalPages
 * @param width
 * @param height
 * @param withBorder
 * @returns {Promise<{images: *[], pages, time: string, status: string}>}
 */
const startRender = async (domain, uid, totalPages, width, height, withBorder) => {
    const start = Date.now();
    const relativePath = `image/photobook/renders/${uid}`;
    const destinationPath = path.join(domainsMap[domain], relativePath);
    const links = [];
    if (!fs.existsSync(destinationPath)) {
        fs.mkdirSync(destinationPath, {recursive: true});
    }
    const additionalBorderWidth = 100;
    const bookWidth = parseInt(width);
    const bookHeight = parseInt(height);
    const browserWidth = bookWidth + (withBorder ? additionalBorderWidth * 2 : 0);
    const browserHeight = bookHeight + (withBorder ? additionalBorderWidth : 0);
    console.log(`Starting render for ${domain} with uid: ${uid} and total pages: ${totalPages}`);
    let page = await browser.createPage(uid)
    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
        const url = placeholdify(renderPage, domain, uid, currentPage - 1, bookWidth, bookHeight, true);
        const destFile = `${destinationPath}/${currentPage}.jpg`;
        await page.goto(url);
        await page.setViewport({
            width: browserWidth,
            height: browserHeight
        });
        await page.screenshot(destFile);
        links.push(`https://${domain}/${relativePath}/${uid}/${currentPage}.jpg`);
    }
    await page.close();
    const end = Date.now();
    console.log(`Total execution time: ${(end - start) / 1000} seconds`);

    return {'status': 'completed', 'pages': totalPages, 'images': links, 'time': `${(end - start) / 1000}`};
}

/**
 * Generate page renders for 3D preview
 *
 * @param domain
 * @param uid
 * @param totalPages
 * @param width
 * @param height
 * @returns {Promise<{data: *[]}>}
 */
const create3DPreviewPages = async (domain, uid, totalPages, width, height) => {
    const browserWidth = parseInt(width);
    const browserHeight = parseInt(height);
    const relativePath = `image/photobook/snapshots/${uid}`;
    const destinationPath = path.join(domainsMap[domain], relativePath);
    if (!fs.existsSync(destinationPath)) {
        fs.mkdirSync(destinationPath, {recursive: true});
    } else {
        fs.readdirSync(destinationPath).forEach(f => {
            const lstat = fs.lstatSync(`${destinationPath}/${f}`);
            if (lstat.isFile()) {
               // fs.rmSync(`${destinationPath}/${f}`);
            }
        });
    }
    console.log(`Creating 3D preview for ${domain} with uid: ${uid} and total pages: ${totalPages}`);
    const browser = await Browser.createInstance(uid);
    let page = await browser.createPage(uid)
    const resultLinks = [];
    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
        let number = currentPage - 2 + currentPage;
        const url = placeholdify(renderPage, domain, uid, currentPage - 1, browserWidth, browserHeight, false);
        const inCacheWithoutModification = await existAndEquals(`${uid}-${currentPage}`, await page.getDOM(url));
        const destFile = `${destinationPath}/full-${currentPage}.jpg`;
        const fileExists = pageExists(destFile, currentPage)
        console.log(`File exists: ${fileExists} and in cache: ${inCacheWithoutModification} for ${url}`)
        if (!inCacheWithoutModification || !fileExists) {
            await page.goto(url);
            await page.setViewport({
                width: browserWidth,
                height: browserHeight
            });
            await page.screenshot(destFile);

            let coverExtraWidth = page.getCoverExtraWidth();
            let image = await Image.load(destFile);
            let borderSize = currentPage === 1 ? Math.round((browserWidth + coverExtraWidth) / 100 * 3) : Math.round(image.height - image.height / 1.02040);

            // if cover is rendering
            if (currentPage === 1) {
                await createCoverPages(image, browserWidth, browserHeight, destinationPath, borderSize, totalPages, coverExtraWidth);
            } else {
                await createPages(number, totalPages, image, borderSize, browserWidth, browserHeight, destinationPath);
            }
        }

        resultLinks.push(`/${relativePath}/${number + 1}.jpg`);
        resultLinks.push(`/${relativePath}/${number + 2}.jpg`);
        // calculate progress
        const progress = Math.round(100 / totalPages * currentPage);
        // send progress to a connected socket
        socketService.emit(uid, 'progress', progress);
    }
    await page.close();
    await browser.close();

    console.log('All pages have been created. Now bending the first and last page valves.')
    await bendFirstPageValve(destinationPath);
    await bendSecondLastPageValve(totalPages, destinationPath);
    //deleteTmpFiles(destinationPath, totalPages);
    console.log('Border created');
    return {data: resultLinks}
}

/**
 * Generate 2-page preview for customer's book
 *
 * @param domain
 * @param uid
 * @param totalPages
 * @param width
 * @param height
 * @returns {Promise<void>}
 */
const createPreview = async (domain, uid, totalPages, width, height) => {
    const multiplier = 1;
    const browserWidth = width * multiplier;
    const browserHeight = height * multiplier;
    const relativePath = `image/photobook/snapshots/${uid}/preview`;
    const destinationPath = `${domainsMap[domain]}/${relativePath}`;
    if (!fs.existsSync(destinationPath)) {
        fs.mkdirSync(destinationPath, {recursive: true});
    }
    console.log(`Creating preview for ${domain} with uid: ${uid} and total pages: ${totalPages}`);
    let page = await browser.createPage(uid)
    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
        const url = placeholdify(renderPage, domain, uid, currentPage - 1, browserWidth, browserHeight, false);
        const destFile = `${destinationPath}/${currentPage}.jpg`;
        await page.goto(url);
        await page.setViewport({
            width: browserWidth,
            height: browserHeight
        });
        await page.screenshot(destFile);
    }
    await page.close();
}

module.exports = {
    startRender,
    create3DPreviewPages,
    createPreview
}