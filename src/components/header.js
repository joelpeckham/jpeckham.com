const components = require('../components');
exports.header = (el) => {
    let hasImage = false;
    let childString = '';
    el.children.forEach((child) => {
        if (child.type === 'tag' && typeof(components[child.name]) === 'function') {
            childString += components[child.name](child);
            if (child.name === 'image') {
                hasImage = true;
            }
        }
    });
    return `<div class = 'header ${hasImage?"headerWithImage":""}'>\n${childString}</div>\n`;
}