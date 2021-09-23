const components = require('../components');
exports.hstack = (el) => {
    childString = '';
    el.children.forEach((child) => {
        if (child.type === 'tag' && typeof(components[child.name]) === 'function') {
            childString += components[child.name](child);
        }
    });
    return `<div class = 'hstack'>\n${childString}</div>\n`
}