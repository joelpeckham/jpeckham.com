const components = require('../components');
exports.carousel = (el) => {
    childString = '';
    el.children.forEach((child) => {
        if (child.type === 'tag' && typeof(components[child.name]) === 'function') {
            childString += components[child.name](child);
        }
    });
    return `<div class = 'carousel'>\n${childString}</div>\n`
}