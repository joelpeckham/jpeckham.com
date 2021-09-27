const components = require('../components');
exports.paragraph = (el) => {
    let data = '';
    if (el.children.length > 0) {
        data = el.children[0].data;
    }
    return `<p>${data}</p>\n`
}