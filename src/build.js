const fs = require('fs-extra');
const cheerio = require('cheerio');
const components = require('./components');
const prettifyHTML = require('html-prettify');

function build(devBuildNumber = null){
    // console.log('Building... with', devBuildNumber);
    let devCode = `
    <script>
    setInterval(function(){
            fetch('/buildStatus').then(response => response.text()).then(text => {
                if(text != ${devBuildNumber}){
                    window.location.reload();
                }
            });
        }, 250);
    </script>`
    //Delete and re-create build folder
    if (fs.existsSync('build')) {
        fs.rmSync('build', {recursive: true});
    }
    fs.mkdirSync('build');
    // Loop through all files in the pages directory
    let files = fs.readdirSync('./pages');
    files.forEach(file => {
        //get file name without extension
        const fileName = file.split('.')[0];
        // console.log("Handling", file);
        const contentXML = cheerio.load(fs.readFileSync(`./pages/${file}`), { xmlMode: true });

        outputHTML = ""
        contentXML.root().children().each((_,el) => {
            if (typeof(components[el.name]) == 'function') {
                outputHTML += components[el.name](el);
            }
        });

        const indexhtml = cheerio.load(`
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <link href="/hamburgers.css" rel="stylesheet">
                <link rel="stylesheet" href="/theme.css" type="text/css">

                <meta charset="UTF-8">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Joel Peckham</title>
            </head>
            <body>${(devBuildNumber != null)?devCode:''}
                <div id="contentContainer">

                </div>
            </body>
        </html>
        `);
        //Attach output HTML to div with id 'contentContainer'
        indexhtml('#contentContainer').html(`\n${outputHTML}`);
        if (fileName == 'index') {
            fs.writeFileSync(`build/index.html`, prettifyHTML(indexhtml.html()));
        } else {
            //Create a new folder for each page
            fs.mkdirSync(`build/${fileName}`);
            fs.writeFileSync(`build/${fileName}/index.html`, prettifyHTML(indexhtml.html()));
        }
    });
    fs.copySync('rootFiles', 'build/');
    fs.copySync('static', 'build/static');
}

exports.build = build;
build();