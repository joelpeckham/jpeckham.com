const components = require('../components');
const util = require('util');
exports.section = (el) => {
    attrString = '';
    if (el.attribs['id']) {
        attrString += ` id="${el.attribs.id}"`;
    }
    childString = '';
    el.children.forEach((child) => {
        if (child.type === 'tag' && typeof(components[child.name]) === 'function') {
            childString += components[child.name](child);
        }
    });
    return `<section ${attrString}>\n${childString}</section>\n`;
}
