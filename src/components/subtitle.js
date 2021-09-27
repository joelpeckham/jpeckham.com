const components = require('../components');
exports.subtitle = (el) => {
    let data = '';
    if (el.children.length > 0) {
        data = el.children[0].data;
    }
    return `<h2 class ='subtitle'>${data}</h2>\n`
}