const fs = require("fs");
const {Image} = require("image-js");

const createCoverPages = async (image, width, height, destinationPath, borderSize, totalPages, coverExtraWidth) => {
    // create left part of cover
    let coverLeft = image.clone().crop({
        x: 0,
        y: 0,
        width: width / 2,
        height: height
    })


    // create right part of cover
    let coverRight = image.clone();
    // if there is no extra cover width crop it as regular
    if (!coverExtraWidth) {
        coverRight = coverRight.crop({
            x: width / 2,
            y: 0,
            width: width / 2,
            height: height
        });
    }
    // if there is extra width - crop it eliminating central part of cover
    if (coverExtraWidth) {
        coverRight = coverRight.crop({
            x: (coverExtraWidth + width) - Math.round(width / 2),
            y: 0,
            width: width / 2,
            height: height
        });
    }

    console.log(`Saving cover right: ${coverLeft.width}x${coverLeft.height} to ${destinationPath}/cover-right.jpg`)
    console.log(`Saving cover left: ${coverLeft.width}x${coverLeft.height} to ${destinationPath}/cover-left.jpg`)
    await coverRight.save(`${destinationPath}/cover-right.jpg`);
    await coverLeft.save(`${destinationPath}/cover-left.jpg`);

    // remove borders(part of the cover which will be bent inside)
    coverLeft = coverLeft.crop({
        x: borderSize,
        y: borderSize,
        width: width / 2 - borderSize,
        height: height - borderSize * 2
    });
    // remove borders(part of the cover which will be bent inside)
    coverRight = coverRight.crop({
        x: 0,
        y: borderSize,
        width: width / 2 - borderSize,
        height: height - borderSize * 2
    });

    await coverRight.save(`${destinationPath}/1.jpg`);
    await coverLeft.save(`${destinationPath}/${totalPages * 2}.jpg`);
}

// slice and save regular pages
const createPages = async (number, totalPages, image, borderSize, width, height, destinationPath) => {
    if (width % 2 !== 0) {
        console.log(`Width is not even. Adding 1 to width: ${width}`)
        width = width + 1;
        image = image.resize({width: width, height: height});
    }
    console.log(
        `Saving page ${number}: ${image.width}x${image.height} to ${destinationPath}/${number}.jpg`
    );
    const isSecondPage = number === 2;
    const isSecondLastPage = number + 1 === totalPages * 2 - 1;
    let leftImage = image.clone().crop({
        x: isSecondPage ? 0 : borderSize,
        y: isSecondPage ? 0 : borderSize,
        width: width / 2 - (isSecondPage ? 0 : borderSize),
        height: height - (isSecondPage ? 0 : borderSize * 2)
    })

    let rightImage = image.clone().crop({
        x: width / 2,
        y: isSecondLastPage ? 0 : borderSize,
        width: width / 2 - (isSecondLastPage ? 0 : borderSize),
        height: height - (isSecondLastPage ? 0 : borderSize * 2)
    });

    await leftImage.save(`${destinationPath}/${number}.jpg`);
    await rightImage.save(`${destinationPath}/${number + 1}.jpg`);
}

const pageExists = (destinationPath, page) => {
    if (page === 1) {
        console.log('Page 1 - force rendering of cover pages')
        return false;
        // return fs.existsSync(`${destinationPath}/cover-left.jpg`) && fs.existsSync(`${destinationPath}/cover-right.jpg`);
    }
    const existsSync = fs.existsSync(`${destinationPath}/${page}.jpg`);
    console.log(`File \`${destinationPath}/${page}.jpg\` exists: ${existsSync}`);
    return existsSync;
}

const deleteTmpFiles = (destinationPath, totalPages) => {
    fs.rmSync(`${destinationPath}/cover-left.jpg`);
    fs.rmSync(`${destinationPath}/cover-right.jpg`);
    for (let i = 1; i <= totalPages; i++) {
        fs.rmSync(`${destinationPath}/full-${i}.jpg`);
    }
}


const bendFirstPageValve = async (destinationPath) => {
    let firstPage = await Image.load(`${destinationPath}/2.jpg`);
    let cover = (await Image.load(`${destinationPath}/cover-right.jpg`)).resize({
        width: firstPage.width,
        height: firstPage.height
    });

    const coverWidth = cover.width;
    const coverHeight = cover.height;
    const borderSize = Math.round(coverHeight - coverHeight / 1.02040);

    const topBorder = cover.clone().crop({x: 0, y: 0, width: coverWidth, height: borderSize}).flipY();
    const leftBorder = cover.clone().crop({x: coverWidth - borderSize, y: 0, width: borderSize, height: coverHeight});
    const bottomBorder = cover.clone().crop({
        x: 0,
        y: coverHeight - borderSize,
        width: coverWidth,
        height: borderSize
    }).flipY();
    firstPage
        .insert(leftBorder)
        .insert(topBorder)
        .insert(bottomBorder, {x: 0, y: coverHeight - borderSize})
        .save(`${destinationPath}/2.jpg`)
}

const bendSecondLastPageValve = async (pagesNumber, destinationPath) => {
    let secondLastPage = await Image.load(`${destinationPath}/${pagesNumber * 2 - 1}.jpg`);
    let cover = (await Image.load(`${destinationPath}/cover-left.jpg`)).resize({
        width: secondLastPage.width,
        height: secondLastPage.height
    });
    const coverWidth = cover.width;
    const coverHeight = cover.height;
    const borderSize = Math.round(coverHeight - coverHeight / 1.02040);

    const topBorder = cover.clone().crop({x: 0, y: 0, width: coverWidth, height: borderSize}).flipY();
    const rightBorder = cover.clone().crop({x: 0, y: 0, width: borderSize, height: coverHeight});
    const bottomBorder = cover.clone().crop({
        x: 0,
        y: coverHeight - borderSize,
        width: coverWidth,
        height: borderSize
    }).flipY();

    //const image = new Image({ width: 2, height: 3, data, kind: 'RGB'});
    secondLastPage
        .insert(rightBorder, {x: coverWidth - borderSize, y: 0})
        .insert(topBorder)
        .insert(bottomBorder, {x: 0, y: coverHeight - borderSize})
        .save(`${destinationPath}/${pagesNumber * 2 - 1}.jpg`)
}

module.exports = {
    createCoverPages,
    createPages,
    deleteTmpFiles,
    pageExists,
    bendFirstPageValve,
    bendSecondLastPageValve
}