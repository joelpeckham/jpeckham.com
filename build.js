console.log('build.js');
const fs = require('fs');

fs.mkdir('build',(err)=>{
    if(err) throw err;
    console.log('build folder created');
    });

fs.copyFile('src/index.html', 'build/index.html', (err) => {
    if (err) throw err;
    console.log('File was copied to destination');
});