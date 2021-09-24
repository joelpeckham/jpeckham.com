const components = require('../components');
exports.image = (el) => {
    return `<img src="${el.attribs.src}" alt="${el.children[0].data}">\n`
}