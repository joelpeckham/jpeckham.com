const components = require('../components');
exports.card = (el) => {
    childString = '';
    el.children.forEach((child) => {
        if (child.type === 'tag' && typeof(components[child.name]) === 'function') {
            childString += components[child.name](child);
        }
    });
    return `<div class = 'card'>\n${childString}</div>\n`
}