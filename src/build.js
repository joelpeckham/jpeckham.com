const fs = require('fs');
const cheerio = require('cheerio');
const components = require('./components');
const format = require('xml-formatter');

const $ = cheerio.load(fs.readFileSync('src/content.xml'), { xmlMode: true });

outputHTML = ""
$.root().children().each((i, el) => {
    if (typeof(components[el.name]) == 'function') {
        outputHTML += components[el.name](el);
    }
});
console.log(format(`<html>${outputHTML}</html>`));


if (fs.existsSync('build')) {
    fs.rmdirSync('build', {recursive: true});
}
fs.mkdirSync('build');

