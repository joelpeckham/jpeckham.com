const fs = require('fs');
const cheerio = require('cheerio');
const components = require('./components');
const prettifyHTML = require('html-prettify');

function build(){
    // console.log("Building...");
    const contentXML = cheerio.load(fs.readFileSync('src/content.xml'), { xmlMode: true });

    outputHTML = ""
    contentXML.root().children().each((_,el) => {
        if (typeof(components[el.name]) == 'function') {
            outputHTML += components[el.name](el);
        }
    });

    //Delete and re-create build folder
    if (fs.existsSync('build')) {
        fs.rmSync('build', {recursive: true});
    }
    fs.mkdirSync('build');

    const indexhtml = cheerio.load(fs.readFileSync('src/index.html'));
    //Attach output HTML to div with id 'contentContainer'
    indexhtml('#contentContainer').html(`\n${outputHTML}`);
    fs.writeFileSync('build/index.html', prettifyHTML(indexhtml.root().html()));
    //Copy index.css to build folder
    fs.copyFileSync('src/index.css', 'build/index.css');
    // console.log("Build Done!");

}

build()

exports.build = build;