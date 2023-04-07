window.onload = async()=>{run();}
async function fetchJsonPromise(url,input) {
    return new Promise((resolve) => {
        fetch(url,{})
        .then((response) => response.json())
        .then((json)=>{resolve(json,input);});
    });
}
const arrowPath = "M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z";
const Icon = "<svg fill=\"currentColor\" style=\"width:1em;height:1em;\"><path fill-rule=\"evenodd\" d=\"PATH\"></path></svg></i>";
const arrowIcon = Icon.replace("PATH",arrowPath)
function toggleCollapse(self) {
    self.parentElement.setAttribute("collapsed",self.parentElement.getAttribute("collapsed")=="false");
}
//const TAB="&nbsp;";//1 space gap
//const TAB="&ensp;";//2 spaces gap
const TAB="&emsp;&ensp;";//  6 spaces gap
async function run() {
    fetchJsonPromise("/sorts/all.json").then((files) => {
        const Proccess = ([dirname,dir],tabs,path,final)=>{
            var Html = "<div class='collapsable' collapsed=true id='" + path + (final?("/"+dirname):"")+"'>"
            Html += "<div onclick='toggleCollapse(this)'>"+TAB.repeat(tabs)+arrowIcon+dirname+"</div>"
            if (dir.directories != null && dir.directories != undefined && Object.entries(dir.directories).length > 0) {
                Object.entries(dir.directories).forEach((folder)=>{
                    Html+=Proccess(folder,tabs+1,path+"/"+folder[0],false);
                });
            }
            if (dir.files != null && dir.files != undefined && dir.files.length > 0) dir.files.forEach(([file,fullpath])=>{Html+=TAB.repeat(tabs+1)+"<a href=\"" + fullpath + "\">"+file+"</a><br>"});
            return Html+(final?("<br>".repeat(3)):"")+"</div>";
        }
        document.getElementById("fileExp").innerHTML = Proccess(["textures",files.directories.assets.directories.textures],0,"minecraft/assets",true);
        toggleCollapse(document.getElementById("minecraft/assets/textures").firstChild)
    });
}