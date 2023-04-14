//#region utils
async function fetchJsonPromise(url,input) {
    return new Promise((resolve) => {
        fetch(url,{})
        .then((response) => response.json())
        .then((json)=>{resolve(json,input);});
    });
};
async function fetchPromise(url,input) {
    return new Promise((resolve) => {
        fetch(url,{})
        .then((response)=>response.text())
        .then((text)=>resolve(text,input));
    });
};
function toDataURL(url) {return new Promise((resolve)=>{
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
        var reader = new FileReader();
        reader.onloadend = function() {
            resolve(reader.result);
        }
        reader.readAsDataURL(xhr.response);
    };
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();
});};
/**
 * gets the dataUrl base64 data from an file
 * @date 4/12/2023
 *
 * @param file file to get base64 data from
 */
function getImageDataURL(file) {
    const properties = file.properties;
    var canv = document.createElement("canvas");
    //create canvas with size of image
    canv.width  = properties.width ;
    canv.height = properties.height;
    ctx = canv.getContext('2d');
    //set all modified pixels
    const pixelsData = properties.imgData;
    if (pixelsData != null && pixelsData != undefined && pixelsData.length > 0) {
        for (let x = 0; x < properties.width; x++) {
            for (let y = 0; y < properties.height; y++) {
                const pixel = pixelsData[x][y];
                const opacity = pixel[1];
                const color = "rgba("+pixel[0].join(",")+","+opacity+")";
                //draw pixels individually from data
                ctx.fillStyle = color;
                ctx.fillRect(x,y,1,1);
            }
        }
    }
    //convert canvas to base64 dataUrl
    return canv.toDataURL();
}

//getImageData(opened[activeIndex])
async function getImageData(file) {
    return new Promise((resolve)=>{
        const {path,properties} = file;
        var canv = document.createElement("canvas");
        //create canvas with size of image
        canv.width  = properties.width ;
        canv.height = properties.height;
        ctx = canv.getContext("2d", { willReadFrequently: true });
        var img = new Image();
        img.src = path;
        img.onload = ()=>{
            ctx.drawImage(img,0,0,properties.width,properties.height);
            var data = [];
            for (let x = 0; x < properties.width; x++) {
                data[x]=[];
                for (let y = 0; y < properties.height; y++) {
                    const pixel = ctx.getImageData(x, y, 1, 1).data;
                    data[x][y] = [[pixel[0],pixel[1],pixel[2]],pixel[3]/255];
                }
            }
            resolve(data);
        }
    });
}
//#endregion utils
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

//#region files/tabs
/** 
 *  It will create a tab for the correspoding file passed in.
 *  @date 4/7/2023
 *
 *  @param file file to open
 */ 
async function openFile(file) {
    file = JSON.parse(decodeURIComponent(file));
    const {name,path,extention,properties} = file;
    //checks that the file is not already open
    for (let i = 0; i < opened.length; i++) {
        const openedFile = changedData[opened[i]];
        if (openedFile.name == name && openedFile.path == path && openedFile.extention == extention && 
            openedFile.properties.width == properties.width && openedFile.properties.height == properties.height) {
            //if it find a tab matching the file switch to that tab
            for(let j = 0; j < fileTabs.children.length; j++) {
                if (decodeURIComponent(fileTabs.children[j].id) == openedFile.path) {
                    selectTab(fileTabs.children[j]);
                }
            }
            return;
        }
    }
    //if file extention is a png
    var tab;
    if (extention == ".png") {
        //create img element to be used by canvas
        properties.imgData = await getImageData(file);
        //add file to opened list
        const path = file.path;
        opened.push(path);
        file.properties.modified = false;
        changedData[path] = file;
        //create tab html element
        tab = document.createElement("blk"); tab.className = "tab"; tab.id = encodeURIComponent(path); tab.setAttribute("selected",false);
        let text = document.createElement("blk"); text.innerHTML = spaces.two+name+spaces.one; text.setAttribute("onclick","selectTab(this.parentElement)");
        let button = document.createElement("button"); button.setAttribute("type","button"); button.className  = "closeButton"; button.setAttribute("onclick","closeTab(this.parentElement)");  button.innerHTML = Xicon;
        text = tab.appendChild(text); button = tab.appendChild(button);
        //append it to parent
        tab  = fileTabs.appendChild(tab);
    } else {
        console.log("currently unsupported \""+extention+"\" file");
    }
    mouse=[-2,-2,0];
    //set tab as current active tab
    if (tab) { selectTab(tab); }
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
        const openedFile = changedData[opened[i]];
        if (openedFile.path == decodeURIComponent(tab.id)) {
            activeIndex = i; break;
        }
    }
    mouse=[-2,-2,0];
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
        const openedFile = changedData[opened[i]];
        //check if file matched element passed in
        if (openedFile.path == id) {
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
                        const val = (decodeURIComponent(tab.id) == openedFile.path);
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
                                if(decodeURIComponent(tempTab.id) == changedData[opened[l]].path) {
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
                activeIndex=-1;lastActiveIndex=-2;opened = opened.filter((el)=>(el!=null&&el!=undefined));
            }
        }
    }
    //delete tab and refresh canvas
    tab.parentElement.removeChild(tab);
    mouse=[-2,-2,0];
    updateCanvas();
}
/**
 * Downloads the entire pack as a .zip
 * @date 4/11/2023
 *
 * @param packname name for the file being downloaded
 */
async function downloadPack(packname) {
    try {
        packname = packname||"pack";
        var zip = new JSZip();
        var folders = {parent:zip};
        changedEntries = Object.entries(changedData);
        for (let i = 0; i < changedEntries.length; i++) {
            const file = changedEntries[i][1];
            const {name,path,extention,properties} = file;
            if (!properties.modified) continue;
            //if file is a png
            if(extention == ".png"){
                var split = path.split("/");
                ongoingPath = "parent";
                const filename = split.pop();//get rid of filename from end
                split.shift();split.shift();//get rid of '' and 'minecraft' from front
                //add all folders needed
                for (let j = 0; j < split.length; j++) {
                    const folder = split[j];
                    if (folders[ongoingPath+"/"+folder] == null) {
                        folders[ongoingPath+"/"+folder] = folders[ongoingPath].folder(folder);
                    }
                    ongoingPath+="/"+folder;
                }
                //add file
                folders["parent/"+split.join("/")].file(filename, (await getImageDataURL(file)).replace("data:image/png;base64,",""), {base64: true});
            }
        }
        //add "pack.png" and "pack.mcmeta" files
        const packpng = await toDataURL("/minecraft/pack.png");
        const mcmeta = await fetchPromise("/minecraft/pack.mcmeta");
        zip.file("pack.png", packpng.replace("data:image/png;base64,",""), {base64: true});
        zip.file("pack.mcmeta", mcmeta);
        //generate zip and download it
        const zipContent = await zip.generateAsync({type:"blob"});
        saveAs(zipContent, packname+".zip");
    } catch (error) {
        console.error(error);
    }
}
//#endregion

/**
 *  updated the canvas to the state of the currently opened file
 *  @date 4/7/2023
 */ 
async function updateCanvas() {
    //if there is a file currently open
    if (activeIndex != -1) {
        const file = changedData[opened[activeIndex]];
        const properties = file.properties;
        let height;
        let width;
        //set the smaller side of texture to 256 and scale the other side to correct aspect ratio
        //unless the texture takes up too much of the screen in which case scale it to not go off screen
        if (lastActiveIndex != activeIndex) {
            lastActiveIndex = activeIndex;
            if (properties.width >= properties.height) {
                height = Math.min(256,editor.clientWidth/properties.width*properties.height-7.5);
                width = height*properties.width/properties.height;
            } else {// properties.height > properties.width
                width = Math.min(256,editor.clientHeight/properties.height*properties.width-7.5);
                height = width*properties.height/properties.width;
            }
            canvas.width  = width;
            canvas.height = height;
        } else { width = canvas.width; height = canvas.height; }
        //clear canvas
        canvasContext.clearRect(0, 0, width, height);
        const pixelSize = Math.ceil(width/properties.width);
        const pixelsData = properties.imgData;
        if (pixelsData != null && pixelsData != undefined && pixelsData.length > 0) {
            for (let x = 0; x < properties.width; x++) {
                for (let y = 0; y < properties.height; y++) {
                    const pixel = pixelsData[x][y];
                    const opacity = pixel[1];
                    const color = "rgba("+pixel[0].join(",")+","+opacity+")";
                    //draw pixels individually from data
                    canvasContext.fillStyle = color;
                    canvasContext.fillRect(Math.floor(x/properties.width*canvas.width),Math.floor(y/properties.height*height),pixelSize,pixelSize);
                }
            }
        }
        const toolSize = toolOptions[curTool].size
        const pixelX = Math.floor((mouse[0]-Math.floor(toolSize/2-0.49))/properties.width*canvas.width);
        const pixelY = Math.floor((mouse[1]-Math.floor(toolSize/2-0.49))/properties.height*height);
        //draw pixel outline around brush
        canvasContext.strokeStyle = "#FFFFFF";
        canvasContext.beginPath();
        canvasContext.rect(pixelX,pixelY,pixelSize*toolSize,pixelSize*toolSize);
        canvasContext.stroke();
    } else {canvasContext.clearRect(0, 0, canvas.width, canvas.height);}
}
addEventListener("resize", updateCanvas);
function onMouseUpdate(e) {
    if (activeIndex == -1) return;
    const file = changedData[opened[activeIndex]];
    const properties = file.properties;

    mouseX = parseInt(e.clientX - canvas.offsetLeft);
    mouseY = parseInt(e.clientY - canvas.offsetTop);
    mouse = [Math.floor(mouseX/canvas.width*properties.width),Math.floor(mouseY/canvas.height*properties.height),e.buttons];
    //if mouse is down
    if (mouse[2]==1) {
        if (curTool=="brush") {
            //draw pixel at mouse pos
            const subtract = Math.floor(toolOptions.brush.size/2-0.49);
            const add = toolOptions.brush.size-subtract;
            const pixelsData = properties.imgData;
            properties.modified = true;
            for (let x = mouse[0]-subtract; x < mouse[0]+add; x++) {
                if (x < 0 || x >= properties.width) continue;
                for (let y = mouse[1]-subtract; y < mouse[1]+add; y++) {
                    if (y < 0 || y >= properties.height) continue;
                    //make sure you dont erase the same spot over and over when youre not trying to
                    if (currentStroke.filter(el=>(el[0]==x&&el[1]==y)).length > 0) continue;
                    currentStroke.push([x,y]);
                    
                    //get brush settings
                    const [bR,bG,bB] = toolOptions.brush.brushColor;
                    const bA = toolOptions.brush.penTransparency;
                    if (pixelsData[x][y] != null && pixelsData[x][y] != undefined) {
                        //get current pixel
                        var pixel = pixelsData[x][y];
                        const [r,g,b] = pixel[0];
                        const a = pixel[1];
                        //overlay with different transparencies
                        pixel = [[r*a*(1-bA)+bR*bA,g*a*(1-bA)+bG*bA,b*a*(1-bA)+bB*bA],a*(1-bA)+bA];
                        //to the closest out of 255
                        pixel[0].map(el=>Math.round(el*255)/255);
                        pixel[1] = Math.round(pixelsData[x][y][1]*255)/255;
                        pixelsData[x][y] = pixel;
                        continue;
                    }
                    pixelsData[x][y] = [[bR,bG,bB],bA];
                }
            }
            properties.imgData = pixelsData;
        } else if (curTool=="eraser") {
            const pixelsData = properties.imgData;
            const subtract = Math.floor(toolOptions.eraser.size/2-0.49);
            const add = toolOptions.eraser.size - subtract;
            const hardness = 1-toolOptions.eraser.eraserHardness;
            properties.modified = true;
            for (let x = mouse[0]-subtract; x < mouse[0]+add; x++) {
                for (let y = mouse[1]-subtract; y < mouse[1]+add; y++) {
                    //make sure you dont erase the same spot over and over when youre not trying to
                    if (currentStroke.filter(el=>(el[0]==x&&el[1]==y)).length > 0) continue;
                    currentStroke.push([x,y]);

                    //to the closest out of 255
                    if (pixelsData[x]!=null && pixelsData[x][y]!=null) { pixelsData[x][y][1] = Math.round(pixelsData[x][y][1]*hardness*255)/255; }
                }
            }
            properties.imgData = pixelsData;
        }
        file.properties = properties;
        changedData[opened[activeIndex]] = file;
        lastRightClick = 0;
    } else if (mouse[2]==2||mouse[2]==3) {
        if (lastRightClick==0) lastRightClickMousePos = [mouse[0],mouse[1]];
        lastRightClick = 1;

        var delta = [mouse[0]-lastRightClickMousePos[0],mouse[1]-lastRightClickMousePos[1]];
        if (delta[0]!=0&&delta[1]==0) console.log(delta);

        lastRightClickMousePos = [mouse[0],mouse[1]]; currentStroke=[];
    } else { lastRightClick = 0; currentStroke=[]; }
    updateCanvas();
}
function canvasZoom(dir) {
    canvas.width -= dir*25;
    canvas.height -= dir*25;
    updateCanvas();
}
function setTool(tool) {
    if (validTools.includes(tool)) {
        const children = document.getElementById("tools").children;
        for (let i = 0; i < children.length; i++) {
            children[i].setAttribute("active",(children[i].id==tool));
        }
        const settingsChildren = document.getElementById("toolOptions").children;
        for (let i = 0; i < settingsChildren.length; i++) {
            settingsChildren[i].setAttribute("active",(settingsChildren[i].id==tool));
        }
    } else { return; }
    curTool=tool;
}
function setOption(tool, option, value) {
    if ((typeof value) == "string" && value.startsWith("#") && value.length==7) {
        value=value.replace("#","0x");
        value = [(value&0xFF0000)>>16,(value&0x00FF00)>>8,(value&0x0000FF)];
    }
    toolOptions[tool][option] = value;
}
async function clearActiveImage() {
    if (activeIndex == -1) return;
    const file = changedData[opened[activeIndex]];
    const properties = file.properties;
    properties.modified = false;
    properties.imgData = await getImageData(file);
    updateCanvas();
}

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
        const out = (await Proccess[structureType](["textures",files.directories.assets.directories.minecraft.directories.textures],0,"/minecraft/assets/minecraft/textures"));
        //set html of file explorer
        fileExp.innerHTML = out;
        //set icon on expand button
        if (structureType=="expanded") document.querySelector("div#fileExpParent > div#searchBar > button").innerHTML = collapseIcon;
        else                           document.querySelector("div#fileExpParent > div#searchBar > button").innerHTML = expandIcon;
    });
}

//#region icon
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
//#endregion

const spaces = {one:"&nbsp;",two:"&ensp;",four:"&emsp;"}
const TAB=spaces.four+spaces.two;// equivilent to 6 spaces gap

var opened = [];
var changedData = {};
var activeIndex = -1;
var lastActiveIndex = -2;
var structureType = "regular";

var fileExpParent;
var searchBar;
var fileExp;
var fileTabs;

var editorParent;
var editor;
var canvas;
var canvasContext;
var img;

var mouse=[-2,-2,0];
const validTools = ["brush","eraser"];
var curTool = "brush";
var toolOptions = {
    "brush":{
        "size":1,
        "brushColor":[255,0,0],
        "penTransparency":1
    },
    "eraser":{
        "size":1,
        "eraserHardness":0.5
    }
};
var lastRightClick = 0;
var lastRightClickMousePos = [-1,-1];
var currentStroke = [];

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
    canvasContext = canvas.getContext('2d');
    
    editor.addEventListener("wheel", (e)=>{if (e.deltaY!=0){canvasZoom(e.deltaY/150)}});
    canvas.onmousemove = onMouseUpdate;
    canvas.onmousedown = onMouseUpdate;
    canvas.onmouseup   = onMouseUpdate;
    canvas.onmouseleave = ((e)=>{onMouseUpdate({ClientX:-2,ClientY:-1,buttons:mouse[2]});});

    document.getElementById("penSize").value         = toolOptions.brush.size;
    function toHex(color) {
        let r = color[0].toString(16).padStart(2,"0");
        let g = color[1].toString(16).padStart(2,"0");
        let b = color[2].toString(16).padStart(2,"0");
        return "#"+r+g+b;
    }
    document.getElementById("brushColor").value      = toHex(toolOptions.brush.brushColor);
    document.getElementById("penTransparency").value = toolOptions.brush.penTransparency*100;
    document.getElementById("eraserSize").value      = toolOptions.eraser.size;
    document.getElementById("eraserHardness").value  = toolOptions.eraser.eraserHardness*100;

    //disables right click centext menu
    fileExpParent.addEventListener('contextmenu', event => event.preventDefault());
    editorParent.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener("keydown", function(e) {
        if (e.key === "s" && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
            e.preventDefault();
            downloadPack("custom");
        } else if (e.key === "p") {
            setTool("brush");
        } else if (e.key === "e") {
            setTool("eraser");
        }
    }, false);
    run();
}