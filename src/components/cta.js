const components = require('../components');
exports.cta = (el) => {
    let text = el.children[0].data;
    let link = el.attribs.link
    return `<a href='${link}'><button>${text}</button></a>\n`;
}