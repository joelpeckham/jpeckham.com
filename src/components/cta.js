const components = require('../components');
exports.cta = (el) => {
    let text = el.children[0].data;
    let link = el.attribs.link
    return `<a class = 'cta' href='${link}'><div class = 'ctaText'>${text}</div></a>\n`;
}