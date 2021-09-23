const fs = require('fs');
const cheerio = require('cheerio');
const components = require('./components');
const prettifyHTML = require('html-prettify');

const contentxml = cheerio.load(fs.readFileSync('src/content.xml'), { xmlMode: true });

outputHTML = ""
contentxml.root().children().each((i, el) => {
    if (typeof(components[el.name]) == 'function') {
        outputHTML += components[el.name](el);
    }
});

//Delete and re-create build folder
if (fs.existsSync('build')) {
    fs.rmdirSync('build', {recursive: true});
}
fs.mkdirSync('build');

const indexhtml = cheerio.load(fs.readFileSync('src/index.html'));
indexhtml('body').html(`\n${outputHTML}`);
fs.writeFileSync('build/index.html', prettifyHTML(indexhtml.root().html()));


