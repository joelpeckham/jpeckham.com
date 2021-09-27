const components = require('../components');
exports.title = (el) => {
    let text = '';
    if (el.children.length > 0) {
        text = el.children[0].data;
    }
    return `<h1 class = "title">${text}</h1>\n`
}