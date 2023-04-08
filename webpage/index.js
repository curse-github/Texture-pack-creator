async function fetchJsonPromise(url,input) {
    return new Promise((resolve) => {
        fetch(url,{})
        .then((response) => response.json())
        .then((json)=>{resolve(json,input);});
    });
}

/**
 * collapses or un-collapses folder
 * @date 4/6/2023
 *
 * @param folder
 */
function toggleCollapse(folder) {
    const val = folder.parentElement.getAttribute("collapsed")=="false";
    folder.parentElement.setAttribute("collapsed",val);
}

/**
 * given a "blk.tab" element it selects the 
 * file and displays it on the canvas.
 * @date 4/7/2023
 *
 * @param tab element passed in
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
            activeIndex = i;break;
        }
    }
    updateCanvas();
}

/**
 * Given a "blk.tab" element it closes out the tab.
 * If it was the active tab it selects the next tab it finds.
 * @date 4/7/2023
 *
 * @param tab element passed in
 */
function closeFile(tab) {
    //loop through currently opened files
    const id = decodeURIComponent(tab.id);
    for(let i = 0; i < opened.length; i++) {
        //check if file matched element passed in
        if (opened[i].path == id) {
            delete opened[i];
            if (opened.length > 1) {
                //if more files are still open seitch to first file it finds
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
                                    console.log(opened[activeIndex]);
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

//general "icon" svg
//usage: Icon.replace("PATH","[your svg path]")
const Icon = "<svg fill=\"currentColor\" style=\"width:1em;height:1em;\"><path d=\"PATH\"></path></svg></i>";
//svg icon for x to close tab
const Xpath = "M.293.293a1 1 0 011.414 0L8 6.586 14.293.293a1 1 0 111.414 1.414L9.414 8l6.293 6.293a1 1 0 01-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 01-1.414-1.414L6.586 8 .293 1.707a1 1 0 010-1.414z";
const Xicon = Icon.replace("PATH",Xpath);
//svg icon for arrow to collapse folder
const arrowPath = "M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z";
const arrowIcon = Icon.replace("PATH",arrowPath);

/**
 * It will create a tab for the correspoding file passed in.
 * @date 4/7/2023
 *
 * @param file file to open
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
        let text = document.createElement("blk"); text.innerHTML = spaces.two+name+extention+spaces.one; text.setAttribute("onclick","selectTab(this.parentElement)");
        let button = document.createElement("button"); button.setAttribute("type","button"); button.className  = "closeButton"; button.setAttribute("onclick","closeFile(this.parentElement)");  button.innerHTML = Xicon;
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
 * updated the canvas to the state of the currently opened file
 * @date 4/7/2023
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

var fileExp;
var editor;
var fileTabs;
var canvas;

const spaces = {one:"&nbsp;",two:"&ensp;",four:"&emsp;"}
const TAB=spaces.four+spaces.two;// equivilent to 6 spaces gap

/**
 * runs all code
 * @date 4/6/2023
 * @async
 */
async function run() {
    //get elements of screen
    fileExp = document.getElementById("fileExp");
    editor = document.getElementById("editor");
    fileTabs = document.getElementById("fileTabs");
    canvas = document.getElementById("canvas");
    //get data from server
    fetchJsonPromise("/sorts/all.json").then(async(files) => {
        //function to procces a directory
        const Proccess = async([dirname,dir],tabs,path,final)=>{return new Promise(async(resolve)=>{
            let Html = "<div class='collapsable' collapsed=true id='" + path + (final?("/"+dirname):"")+"'>"
            Html += "<div onclick='toggleCollapse(this)'>"+TAB.repeat(tabs)+arrowIcon+dirname+"</div>"
            //run fuction recursively to process sub-directories
            if (dir.directories != null && dir.directories != undefined && Object.entries(dir.directories).length > 0) {
                let directoriesEntries = Object.entries(dir.directories);
                for(let i = 0; i < directoriesEntries.length; i++) {
                    let folder = directoriesEntries[i];
                    Html+=await Proccess(folder,tabs+1,path+"/"+folder[0],false);
                }
            }
            //append all single files
            if (dir.files != null && dir.files != undefined && dir.files.length > 0) dir.files.forEach((file)=>{
                const {name,path,extention,properties} = file;
                Html+="<div onclick=\"openFile('"+encodeURIComponent(JSON.stringify(file))+"','"+encodeURIComponent(path)+"')\">"+TAB.repeat(tabs+1)+name+extention+"</div>"
            });
            //return data
            resolve(Html+(final?("<br>".repeat(3)):"")+"</div>");
        });}
        //set file explorer html to file system generated above
        fileExp.innerHTML = await Proccess(["textures",files.directories.assets.directories.textures],0,"minecraft/assets",true);
        //un-collapse first directory
        toggleCollapse(document.getElementById("minecraft/assets/textures").firstChild)
    });
}
//run the "run" function when the page is finished loading
window.onload = async()=>{run();}