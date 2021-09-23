const components = require('../components');
exports.title = (el) => {
    text = el.children[0].data;
    return `<h1>${text}</h1>`
}