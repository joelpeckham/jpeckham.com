const components = require('../components');
exports.card = (el) => {
    let childString = '';
    el.children.forEach((child) => {
        hasImage = false;
        if (child.type === 'tag' && typeof(components[child.name]) === 'function') {
            childString += components[child.name](child);
            if (child.name === 'image') {
                hasImage = true;
            }
        }
    });

    return `<div class = 'card ${hasImage?"":"cardWithImage"}'>\n${childString}</div>\n`
}