async function fetchJsonPromise(url,input) {
    return new Promise((resolve) => {
        fetch(url,{})
        .then((response) => response.json())
        .then((json)=>{resolve(json,input);});
    });
}
function toggleCollapse(self) {
    self.parentElement.setAttribute("collapsed",self.parentElement.getAttribute("collapsed")=="false");
}
const Xpath = "M.293.293a1 1 0 011.414 0L8 6.586 14.293.293a1 1 0 111.414 1.414L9.414 8l6.293 6.293a1 1 0 01-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 01-1.414-1.414L6.586 8 .293 1.707a1 1 0 010-1.414z";
const Icon = "<svg fill=\"currentColor\" style=\"width:1em;height:1em;\"><path d=\"PATH\"></path></svg></i>";
const Xicon = Icon.replace("PATH",Xpath);
function selectTab(self) {
    const tabs = fileTabs.children;
    for(let i = 0; i < tabs.length; i++) {
        tabs[i].setAttribute("selected",false);
    }
    self.setAttribute("selected",true);
    for(let i = 0; i < opened.length; i++) {
        if (opened[i].path == decodeURIComponent(self.id)) {
            activeIndex = i;break;
        }
    }
    updateCanvas();
}
function closeFile(tab) {
    const id = decodeURIComponent(tab.id);
    for(let i = 0; i < opened.length; i++) {
        if (opened[i].path == id) {
            delete opened[i];
            if (opened.length > 1) {
                if(i==opened.length-1) {i-=1; activeIndex = i; }
                else { activeIndex = i; i++; }
                for(let j = 0; j < fileTabs.children.length; j++) {
                    const tab = fileTabs.children[j]
                    const val = (decodeURIComponent(tab.id) == opened[i].path)
                    tab.setAttribute("selected",val);
                    
                }
                opened = opened.filter((el)=>(el!=null&&el!=undefined))
            } else { activeIndex = -1; }
        }
    }
    tab.parentElement.removeChild(tab);
    updateCanvas();
}
function openFile(file) {
    file = JSON.parse(decodeURIComponent(file));
    const {name,path,extention,properties} = file;
    for (let i = 0; i < opened.length; i++) {
        if (opened[i].name == name && opened[i].extention == extention && JSON.stringify(opened[i].properties) == JSON.stringify(properties)) return;
    }
    if (extention == ".png") {
        opened.push(file);
        let tab = document.createElement("blk"); tab.className = "tab"; tab.id = encodeURIComponent(path); tab.setAttribute("selected",false);
        var text = document.createElement("blk"); text.innerHTML = spaces.two+name+extention+spaces.one; text.setAttribute("onclick","selectTab(this.parentElement)");
        let button = document.createElement("button"); button.setAttribute("type","button"); button.className  = "closeButton"; button.setAttribute("onclick","closeFile(this.parentElement)");  button.innerHTML = Xicon;
        text = tab.appendChild(text); button = tab.appendChild(button);
        tab  = fileTabs.appendChild(tab);
        selectTab(tab);
        activeIndex = opened.length-1;
    } else {
        console.log("currently unsupported \""+extention+"\" file");
    }
    updateCanvas();
}
function updateCanvas() {
    if (activeIndex != -1) {
        const {name,path,extention,properties} = opened[activeIndex];
        canvas.setAttribute("src",path);
        canvas.setAttribute("style","height:256px;width:"+256*properties.width/properties.height+"px");
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
const arrowPath = "M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z";
const arrowIcon = Icon.replace("PATH",arrowPath);
async function run() {
    fileExp = document.getElementById("fileExp");
    editor = document.getElementById("editor");
    fileTabs = document.getElementById("fileTabs");
    canvas = document.getElementById("canvas");
    fetchJsonPromise("/sorts/all.json").then((files) => {
        const Proccess = ([dirname,dir],tabs,path,final)=>{
            let Html = "<div class='collapsable' collapsed=true id='" + path + (final?("/"+dirname):"")+"'>"
            Html += "<div onclick='toggleCollapse(this)'>"+TAB.repeat(tabs)+arrowIcon+dirname+"</div>"
            if (dir.directories != null && dir.directories != undefined && Object.entries(dir.directories).length > 0) {
                Object.entries(dir.directories).forEach((folder)=>{
                    Html+=Proccess(folder,tabs+1,path+"/"+folder[0],false);
                });
            }
            if (dir.files != null && dir.files != undefined && dir.files.length > 0) dir.files.forEach((file)=>{
                const {name,path,extention,properties} = file;
                Html+="<div onclick=\"openFile('"+encodeURIComponent(JSON.stringify(file))+"','"+encodeURIComponent(path)+"')\">"+TAB.repeat(tabs+1)+name+extention+"</div>"
            });
            return Html+(final?("<br>".repeat(3)):"")+"</div>";
        }
        fileExp.innerHTML = Proccess(["textures",files.directories.assets.directories.textures],0,"minecraft/assets",true);
        toggleCollapse(document.getElementById("minecraft/assets/textures").firstChild)
    });
}
window.onload = async()=>{run();}