const components = require('../components');
exports.image = (el) => {
    let name = '';
    if (el.children.length > 0) {
        name = el.children[0].data;
    }
    return `<img src="${el.attribs.src}" alt="${name}">\n`
}