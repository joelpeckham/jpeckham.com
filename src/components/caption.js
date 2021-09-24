const components = require('../components');
exports.caption = (el) => {
    let caption = el.children[0].data;
    return `<small class ='caption'>${caption}</small>\n`
}