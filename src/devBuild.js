const cheerio = require('cheerio');
const build = require("./build.js").build;
const fs = require('fs');

let currentBuild = 0;
build();
addDevBuildHTML();

function addDevBuildHTML(){
    const html = fs.readFileSync('./build/index.html', 'utf8');
    const $ = cheerio.load(html);
    $('body').append(
    `<script>
        setInterval(function(){
            fetch('/buildStatus').then(response => response.text()).then(text => {
                //reload window
                if(text != ${currentBuild}){
                    window.location.reload();
                }
            });
        }, 250);
    </script>`);
    fs.writeFileSync('./build/index.html', $.html());
}

// Spin up minimal node server to host the build directory for development.
// Don't use express.
// Server reponds to GET requests to /build/index.html and serves the build directory.
// Server responds to GET requests to /buildStatus and returns json with the build changed status.
const http = require('http');
const server = http.createServer((req, res) => {
    if (req.url === '/buildStatus') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(currentBuild.toString());
    } else if (req.url === '/') {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(fs.readFileSync('./build/index.html', 'utf8'));
    } else if(fs.existsSync('./build' + req.url)){
        contentTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml'
        }
        res.writeHead(200, {'Content-Type': contentTypes[req.url.substr(req.url.lastIndexOf('.'))]});
        res.end(fs.readFileSync('./build' + req.url, 'utf8'));
    }
    else {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('404');
    }
});
server.listen(8080);
//Server is now running on port 8080


// If a file in the src directory is changed, rebuild the site.
fs.watch('./src', (eventType, filename) => {
    if (filename) {
        currentBuild++;
        build();
        addDevBuildHTML();
    }
});

