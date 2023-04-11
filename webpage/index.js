async function fetchJsonPromise(url,input) {
    return new Promise((resolve) => {
        fetch(url,{})
        .then((response) => response.json())
        .then((json)=>{resolve(json,input);});
    });
}

/**
 *  collapses or un-collapses folder
 *  @date 4/6/2023
 *
 *  @param folder
 */ 
function toggleCollapse(folder) {
    const val = folder.parentElement.getAttribute("collapsed")=="false";
    folder.parentElement.setAttribute("collapsed",val);
}

//general "icon" svg
//usage: Icon.replace("PATH","[your svg path]")
const Icon = "<svg fill=\"currentColor\" style=\"width:1em;height:1em;\"><path d=\"PATH\"></path></svg>";

//svg icon for x to close tab
const Xpath = "M.293.293a1 1 0 011.414 0L8 6.586 14.293.293a1 1 0 111.414 1.414L9.414 8l6.293 6.293a1 1 0 01-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 01-1.414-1.414L6.586 8 .293 1.707a1 1 0 010-1.414z";
const Xicon = Icon.replace("PATH",Xpath);
//svg icon for arrow to collapse folder
const arrowPath = "M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z";
const arrowIcon = Icon.replace("PATH",arrowPath);
//svg icon for arrow to collapse file structuere
const collapsePath = "M1 8a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13A.5.5 0 0 1 1 8Zm7-8a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 4.293V.5A.5.5 0 0 1 8 0Zm-.5 11.707-1.146 1.147a.5.5 0 0 1-.708-.708l2-2a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 11.707V15.5a.5.5 0 0 1-1 0v-3.793Z";
const collapseIcon = Icon.replace("PATH",collapsePath).replace(" style=\"width:1em;height:1em;\"","");
//svg icon for arrow to expand file structuere
const expandPath = "M1 8a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13A.5.5 0 0 1 1 8ZM7.646.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 1.707V5.5a.5.5 0 0 1-1 0V1.707L6.354 2.854a.5.5 0 1 1-.708-.708l2-2ZM8 10a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 14.293V10.5A.5.5 0 0 1 8 10Z";
const expandIcon = Icon.replace("PATH",expandPath).replace(" style=\"width:1em;height:1em;\"","");

/**
 *  It will create a tab for the correspoding file passed in.
 *  @date 4/7/2023
 *
 *  @param file file to open
 */ 
function openFile(file) {
    file = JSON.parse(decodeURIComponent(file));
    const {name,path,extention,properties} = file;
    //checks that the file is not already open
    for (let i = 0; i < opened.length; i++) {
        if (opened[i].name == name && opened[i].path == path && opened[i].extention == extention && JSON.stringify(opened[i].properties) == JSON.stringify(properties)) {
            //if it find a tab matching the file switch to that tab
            for(let j = 0; j < fileTabs.children.length; j++) {
                if (decodeURIComponent(fileTabs.children[j].id) == opened[i].path) {
                    selectTab(fileTabs.children[j]);
                }
            }
            return;
        }
    }
    //if file extention is a png
    if (extention == ".png") {
        //add file to opened list
        opened.push(file);
        //create tab html element
        let tab = document.createElement("blk"); tab.className = "tab"; tab.id = encodeURIComponent(path); tab.setAttribute("selected",false);
        let text = document.createElement("blk"); text.innerHTML = spaces.two+name+spaces.one; text.setAttribute("onclick","selectTab(this.parentElement)");
        let button = document.createElement("button"); button.setAttribute("type","button"); button.className  = "closeButton"; button.setAttribute("onclick","closeTab(this.parentElement)");  button.innerHTML = Xicon;
        text = tab.appendChild(text); button = tab.appendChild(button);
        //append it to parent
        tab  = fileTabs.appendChild(tab);
        //set tab as current active tab
        selectTab(tab);
    } else {
        console.log("currently unsupported \""+extention+"\" file");
    }
    updateCanvas();
}
/**
 *  given a "blk.tab" element it selects the 
 *  file and displays it on the canvas.
 *  @date 4/7/2023
 *
 *  @param tab element passed in
 */ 
function selectTab(tab) {
    //loop through all tabs and set to not selected
    const allTabs = fileTabs.children;
    for(let i = 0; i < allTabs.length; i++) {
        allTabs[i].setAttribute("selected",false);
    }
    //set tab specified as selected
    tab.setAttribute("selected",true);
    //set the activeIndex variable correctly
    for(let i = 0; i < opened.length; i++) {
        if (opened[i].path == decodeURIComponent(tab.id)) {
            activeIndex = i; break;
        }
    }
    updateCanvas();
}
/**
 *  Given a "blk.tab" element it closes out the tab.
 *  If it was the active tab it selects the next tab it finds.
 *  @date 4/7/2023
 *
 *  @param tab element passed in
 */ 
function closeTab(tab) {
    //loop through currently opened files
    const id = decodeURIComponent(tab.id);
    for(let i = 0; i < opened.length; i++) {
        //check if file matched element passed in
        if (opened[i].path == id) {
            delete opened[i];
            if (opened.length > 1) {
                //if more files are still open
                if (tab.getAttribute("selected")=="true") {
                    //if it is the currently opened tab get closest file
                    //and set activeIndex
                    if(i==opened.length-1) {i-=1; activeIndex = i; }
                    else { activeIndex = i; i++; }
                    //find html element for coresponding file
                    for(let j = 0; j < fileTabs.children.length; j++) {
                        const tab = fileTabs.children[j];
                        const val = (decodeURIComponent(tab.id) == opened[i].path);
                        //set it to selected and others to not selected
                        tab.setAttribute("selected",val);
                    }
                    opened = opened.filter((el)=>(el!=null&&el!=undefined));
                } else {
                    //if it was not the selected tab just update activeIndex
                    opened = opened.filter((el)=>(el!=null&&el!=undefined));
                    for(let j = 0; j < fileTabs.children.length; j++) {
                        const tempTab = fileTabs.children[j];
                        //find the selected tab
                        if (tempTab.getAttribute("selected")=="true") {
                            //find associated file with tab
                            for(let l = 0; l < opened.length; l++) {
                                if(decodeURIComponent(tempTab.id) == opened[l].path) {
                                    //set activeIndex
                                    activeIndex=l;
                                    break;
                                }
                            }
                            break;
                        }
                    }
                }
            } else {
                //if it is the last file open set activeIndex to -1
                activeIndex = -1; opened = opened.filter((el)=>(el!=null&&el!=undefined));
            }
        }
    }
    //delete tab and refresh canvas
    tab.parentElement.removeChild(tab);
    updateCanvas();
}

/**
 *  updated the canvas to the state of the currently opened file
 *  @date 4/7/2023
 */ 
function updateCanvas() {
    //if there is a file currently open
    if (activeIndex != -1) {
        const {name,path,extention,properties} = opened[activeIndex];
        let height;
        let width;
        //set the smaller side of texture to 256 and scale the other side to correct aspect ratio
        //unless the texture takes up too much of the screen in which case scale it to not go off screen
        if (properties.width >= properties.height) {
            height = Math.min(256,editor.clientWidth/properties.width*properties.height-7.5);
            width = height*properties.width/properties.height;
        } else {// properties.height > properties.width
            width = Math.min(256,editor.clientHeight/properties.height*properties.width-7.5);
            height = width*properties.height/properties.width;
        }
        //set image src of canvas to file currently opened
        canvas.setAttribute("src",path);
        canvas.setAttribute("style","height:"+height+"px;width:"+width+"px");
    } else { canvas.setAttribute("src",""); canvas.setAttribute("style","height:0px;width:0px");}
}

var opened = [];
var activeIndex = -1;
//variable to set which sort is being used
var structureType = "regular";

var fileExpParent;
var searchBar;
var fileExp;
var fileTabs;

var editorParent;
var editor;
var canvas;

const spaces = {one:"&nbsp;",two:"&ensp;",four:"&emsp;"}
const TAB=spaces.four+spaces.two;// equivilent to 6 spaces gap


/**
 *  returns a boolean of if the string matches the current search
 *  @date 4/7/23
 *  @returns boolean
 */
function containsSearch(str) {
    if (searchBar.value.trim() == "") return true;
    var contains = true;
    //split apart individual parameters of search
    const splt = searchBar.value.split(" ").map(el=>el.trim());
    for(let i = 0; i < splt.length; i++) {
        const part = splt[i];
        if (part == null || part == undefined || part == "") continue;
        const tempContains = part.startsWith("!")?(!(str.toLowerCase()).includes(part.toLowerCase().substring(1))):(str.toLowerCase()).includes(part.toLowerCase())
        contains = contains&&tempContains;
    }
    return contains;
}

/**
 * runs all code
 * @date 4/6/2023
 * @async
 */
async function run() {
    //get data from server
    fetchJsonPromise("/sorts/all.json").then(async(files) => {
        fileExp.innerHTML = "";
        const Proccess = ({
            "regular":async([dirname,dir],tabs,fullpath,final)=>{return new Promise(async(resolve)=>{
                final = (final||(final==null));
                let Html = "<div class='collapsable' collapsed="+((searchBar.value=="")&&!final)+" id='"+fullpath+"'>";
                Html += "<div onclick='toggleCollapse(this)'>"+TAB.repeat(tabs)+arrowIcon+dirname+"</div>";
                var foundAny = false;
                if (dir != null) {
                    if (dir.directories != null && dir.directories != undefined && Object.entries(dir.directories).length > 0) {
                        //run fuction recursively to process sub-directories
                        let directoriesEntries = Object.entries(dir.directories);
                        for(let i = 0; i < directoriesEntries.length; i++) {
                            let folder = directoriesEntries[i];
                            const [add, foundFile] = await Proccess[structureType](folder,tabs+1,fullpath+"/"+folder[0],false);
                            //only add folder to html if it has a file that matched the search parameters
                            if (foundFile) { Html += add; foundAny = true;}
                        }
                    }
                    //append all single files
                    if (dir.files != null && dir.files != undefined && dir.files.length > 0) { dir.files.forEach((file)=>{
                        const {name,path,extention,properties} = file;
                        //check that filename matches search parameters
                        if (containsSearch(name)) {
                            Html+="<div onclick=\"openFile('"+encodeURIComponent(JSON.stringify(file))+"','"+encodeURIComponent(path)+"')\">"+TAB.repeat(tabs+1)+name+"</div>";
                            foundAny = true;
                        }
                    }); }
                }
                //if its the first folder given dont return extra data
                if (final) resolve(Html+(final?("<br>".repeat(3)):"")+"</div>");
                else resolve([Html+(final?("<br>".repeat(3)):"")+"</div>",foundAny]);
            });},
            "expanded":async([dirname,dir],tabs,fullpath,final,parent)=>{return new Promise(async(resolve)=>{
                final = (final||(final==null));
                parent = final?fullpath:parent;
                let Html = "";
                //if it's the first directory given create a folder header
                if (final) {
                    Html =  "<div class='collapsable' collapsed="+((searchBar.value=="")&&!final)+" id='"+fullpath+"'>";
                    Html += "<div onclick='toggleCollapse(this)'>"+arrowIcon+dirname+"</div>";
                }
                if (dir != null) {
                    if (dir.directories != null && Object.entries(dir.directories).length > 0) {
                        //process nested directories
                        const dirEntries = Object.entries(dir.directories);
                        for(let i = 0; i < dirEntries.length; i++) {
                            const entry = dirEntries[i];
                            //call function recursively
                            Html += await Proccess[structureType](entry,0,fullpath+"/"+entry[0],false,parent);
                        }
                    }
                    if (dir.files != null && dir.files.length > 0) {
                        //add all files from folder to html
                        for(let i = 0; i < dir.files.length; i++) {
                            const file = dir.files[i];
                            const {name,path,extention,properties} = file;
                            //check that filename matches search parameters
                            if (containsSearch(path.replace(parent,""))) {
                                Html+="<div onclick=\"openFile('"+encodeURIComponent(JSON.stringify(file))+"','"+encodeURIComponent(path)+"')\">"+TAB.repeat(tabs+1)+path.replace(parent,"")+"</div>";
                            }
                        }
                    }
                }
                //if its the final add end div tag to close parent folder
                if (final) {
                    resolve(Html+(final?("<br>".repeat(3)):"")+"</div>");
                } else {
                    resolve(Html);
                }
            });}
        })
        //run Proccess function for coresponding structure type
        //pass in directory to process, number of tabs, and full path to directory
        const out = (await Proccess[structureType](["textures",files.directories.assets.directories.textures],0,"/minecraft/assets/textures"));
        //set html of file explorer
        fileExp.innerHTML = out;
        //set icon on expand button
        if (structureType=="expanded") document.querySelector("div#fileExpParent > div#searchBar > button").innerHTML = collapseIcon;
        else                           document.querySelector("div#fileExpParent > div#searchBar > button").innerHTML = expandIcon;
    });
}
//run the "run" function when the page is finished loading
window.onload = async()=>{
    //get elements of screen
    fileExpParent = document.getElementById("fileExpParent");
    searchBar     = document.querySelector("div#searchBar > input[type='text']" );
    searchBar.setAttribute("oninput","run()");
    fileExp       = document.getElementById("fileExp"      );

    editorParent  = document.getElementById("editorParent" );
    fileTabs      = document.getElementById("fileTabs"     );
    editor        = document.getElementById("editor"       );
    canvas        = document.getElementById("canvas"       );
    //disables right click centext menu
    fileExpParent.addEventListener('contextmenu', event => event.preventDefault());
    editorParent.addEventListener('contextmenu', event => event.preventDefault());
    run();
}