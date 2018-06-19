/**
 * Enable question mark button and
 */


let initialized = false;
let container, button, title, close, content;





// initialize
const initDOM = () => {

    if (initialized){
        return true;
    }

    container = document.getElementById('help_container');
    button = document.getElementById('help_button');
    title = document.getElementById('help_title');
    close = document.getElementById('help_close');
    content = document.getElementById('help_content');

    if (!container || !button || !title || !content || !close){
        console.error('Could not find help DOM');
        return false;
    }

    // show help
    button.onclick = ()=>{
        container.style.display = 'block';
    }

    // close help
    close.onclick = ()=>{
        container.style.display = 'none';
    }
    return true;
}

// init help with given titel and content Url
export const initHelp = (helpTitle, contentUrl) =>{
    if (!initDOM()){
        // an error occured during init
        return;
    }
        
    title.innerHTML = helpTitle;
    loadData(contentUrl);
}

// load data from the given url to the content container
const loadData = (contentUrl) => {
    content.innerHTML = "Loading...";
    fetch(contentUrl).then((response) => {
        return response.text();
    }).then((html)=>{
        content.innerHTML = html;
    }).catch((error) => {
        console.warn(error);
    });
}
