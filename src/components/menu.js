const components = require('../components');
const cheerio = require('cheerio');
const { title } = require('./title');

function getRoot(el){
    if (el.parent == null) {
        return el;
    }
    else {
        return getRoot(el.parent);
    }
}

function findElements(el, selector, foundElements = []){
    if (el.type == 'tag' && el.name == selector) {
        foundElements.push(el);
    }
    if (el.children) {
        for (let child of el.children) {
            findElements(child, selector, foundElements);
        }
    }
    return foundElements;
}

exports.menu = (el) => {
    let titleHtml = '';
    let linkHtml = '';
    let root = getRoot(el);
    let sections = findElements(root, "section");
    sections.forEach(section => {
        let id = section.attribs.id;
        linkHtml += `<a class = 'menuSectionLink' href="#${id}">${id}</a>`;
    });

    el.children.forEach((child) => {
        if (child.type == 'tag' && child.name == 'title') {
            titleHtml = `<h1 class = 'menuTitle'>${child.children[0].data}</h1>`;
        }
        else if (child.type == 'tag' && child.name == 'link') {
            linkHtml += `<a class = 'menuSectionLink cta canBeCTA' href = '${child.attribs.link}'>${child.children[0].data}</a>`;
        }
    });

    return( 
    `
    <div class = 'menuContainer'>
        <div id = 'menuInside' class = 'menu'>
        ${titleHtml}
            <div class = "menuLinks">
                ${linkHtml}
            </div>
        </div>
        <div id = 'burger' class="hamburger">
            <div class="hamburger-box hamburger--collapse">
                <div class="hamburger-inner"></div>
            </div>
        </div>
    </div>
    <script>
        let burger = document.getElementById('burger');
        burger.addEventListener('click', function(){
            Array.from(document.getElementsByClassName('canBeCTA')).forEach(link => {
                link.classList.toggle('cta');
            });
            burger.children[0].classList.toggle('is-active');
            document.getElementById('menuInside').classList.toggle('menuOpen');
        });
        window.addEventListener('resize', function(){
            let burger = document.getElementById('burger');
            if (window.innerWidth > 800 && burger.children[0].classList.contains('is-active')) {
                burger.click();
                console.log('clicked');
            }
        });
    </script>
    `
    );
}