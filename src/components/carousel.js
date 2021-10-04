const components = require('../components');
exports.carousel = (el) => {
    let childString = '';
    el.children.forEach((child) => {
        if (child.type === 'tag' && typeof(components[child.name]) === 'function') {
            childString += components[child.name](child);
        }
    });
    return (
        `
        <div class="carouselContainer">
            <div class = 'carousel'>
                <div class = 'fadeBefore'></div>
                <div class = 'fadeAfter'></div>
                ${childString}
            </div>
        </div>
        `);
}