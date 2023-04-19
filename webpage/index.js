class util {
    static async fetchJsonPromise(url,input) {
        return new Promise((resolve) => {
            fetch(url,{})
            .then((response) => response.json())
            .then((json)=>{resolve(json,input);});
        });
    };
    static async fetchPromise(url,input) {
        return new Promise((resolve) => {
            fetch(url,{})
            .then((response)=>response.text())
            .then((text)=>resolve(text,input));
        });
    };
    static toDataURL(url) {return new Promise((resolve)=>{
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
     * gets a 2d array of pixels with [[r,g,b],a]
     * @async
     * @param file file data to get pixels from
     */
    static async getImagePixels(file) {
        return new Promise((resolve)=>{
            const {path,properties} = file;
            var canv = document.createElement("canvas");
            //create canvas with size of image
            canv.width  = properties.width ;
            canv.height = properties.height;
            var ctx = canv.getContext("2d", { willReadFrequently: true });
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
    static RgbToHex(color) {
        let r = color[0].toString(16).padStart(2,"0");
        let g = color[1].toString(16).padStart(2,"0");
        let b = color[2].toString(16).padStart(2,"0");
        return "#"+r+g+b;
    }
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

/**
 *  returns a boolean of if the string matches the current search
 *  @date 4/7/23
 *  @returns boolean
 */
function matchesSearch(str,file) {
    if (searchBar.value.trim() == "") return true;
    str = str.toLowerCase();
    var contains = true;
    //split apart individual parameters of search
    var splt = searchBar.value.split(" ")
    splt = splt.filter(part=>(part!=null&&part!=""))
    splt = splt.map(part=>part.trim().toLowerCase());
    for(let i = 0; i < splt.length; i++) {
        const part = splt[i];
        var tempContains = false;
        if (part.startsWith("!")) {
            tempContains = !str.includes(part.replace("!",""));
        } else if (part.startsWith("#")) {
            tempContains = file.properties.tags!=null?(file.properties.tags.includes(part.replace("#",""))):(false);
        } else if (part == "mod" || part == "modified") {
            if (canvas.proccessedImages[file.path]) tempContains = canvas.proccessedImages[file.path].properties.modified||false;
            else tempContains = false;
        } else {
            tempContains = str.includes(part);
        }
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
    util.fetchJsonPromise("/sorts/all.json").then(async(files) => {
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
                        if (matchesSearch(name,file)) {
                            Html+="<div id=\"" + path + "\" onclick=\"canvas.openFile('"+encodeURIComponent(JSON.stringify(file))+"','"+encodeURIComponent(path)+"')\">"+TAB.repeat(tabs+1)+"<a>"+name+"</a></div>";
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
                            if (matchesSearch(path.replace(parent,""),file)) {
                                Html+=TAB.repeat(tabs+1)+"<div onclick=\"canvas.openFile('"+encodeURIComponent(JSON.stringify(file))+"','"+encodeURIComponent(path)+"')\">"+path.replace(parent,"")+"</div>";
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
        fileExp.innerHTML = out;
        Object.entries(canvas.proccessedImages).forEach(([key,value])=>{
            if(value.properties.modified){
                var el=document.getElementById(value.path);
                if(el!=null)el.setAttribute("modified","true");
            }
        });
        
        //set html of file explorer
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

var structureType = "regular";

var fileExpParent;
var searchBar;
var fileExp;

var canvas = new myCanvas();

//run the "run" function when the page is finished loading
window.onload = async()=>{
    //get elements of screen
    fileExpParent = document.getElementById("fileExpParent");
    //disables right click centext menu
    fileExpParent.addEventListener('contextmenu', event => event.preventDefault());

    searchBar = document.querySelector("div#searchBar > input[type='text']" );
    searchBar.setAttribute("oninput","run()");

    fileExp = document.getElementById("fileExp");

    run();
}