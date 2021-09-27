const components = require('../components');
const { image } = require('./image');
exports.card = (el) => {
    let textElements = '';
    let imageElements = '';
    el.children.forEach((child) => {
        if (child.type === 'tag' && typeof(components[child.name]) === 'function') {
            if (child.name === 'image') {
                imageElements = components[child.name](child);
            }
            else{
                textElements += components[child.name](child);
            }
        }
    });

    return `<div class = 'card ${imageElements==''?"":"cardWithImage"}'>\n${imageElements}<div class = cardText>${textElements}</div></div>\n`
}