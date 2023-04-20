class myCanvas {

    //#region vars
    //constant
    self;
    static defaultColor = [183,175,173];// ash- "Make it minecraft title gray."

    //html elements
    editorParent;
    editor;
    fileTabs;
    canvas;
    canvasContext;
    toolsHtml;
    toolSettings;

    //opened files/data
    opened = [];
    proccessedImages = {};
    activeIndex = -1;
    lastActivePath = "";

    mouse=[-2,-2,0];
    lastMouse = this.mouse;
    rightMouse=[-2,-2,0];
    lastRightMouse = this.rightMouse;
    //settings
    canvasState = {
        width:0,
        height:0,
        imgWidth:0,
        imgHeight:0,
        top:0,
        left:0
    }
    reloadImage = false;
    curTool;
    tools = {};
    currentStroke = [];
    strokeHistory = [];
    strokeUndidHistory = [];
    //#endregion

    constructor() {
        self = this;

        this.curTool = "brush";

        window.addEventListener("load", (e) => {
            self.editorParent  = document.getElementById("editorParent" );
            self.fileTabs      = document.getElementById("fileTabs"     );
            self.toolsHtml = document.getElementById("tools");
            self.toolSettings = document.getElementById("toolSettings");

            self.editor        = document.getElementById("editor"       );
            self.editor.addEventListener("wheel", self.canvasZoom);
            self.editor.onmousemove = self.editorOnMouse;
            self.editor.onmousedown = self.editorOnMouse;
            self.editor.onmouseup   = self.editorOnMouse;
            self.editor.onmouseleave = ((e)=>{
                self.reloadImage=true;
                const {width,imgWidth,left,top} = self.canvasState;
                const pixelSize = width/imgWidth;
                const x = (self.rightMouse[0]||0)+0.5;
                const y = (self.rightMouse[1]||0)+0.5;
                self.editorOnMouse({
                    clientX: x*pixelSize+left+self.editor.offsetLeft,
                    clientY: y*pixelSize+top +self.editor.offsetTop ,
                    buttons: e.buttons
                });
            });

            self.canvas        = document.getElementById("canvas"       );
            self.canvas.onmousemove = self.onMouse;
            self.canvas.onmousedown = self.onMouse;
            self.canvas.onmouseup   = self.onMouse;
            self.canvas.onmouseleave = ((e)=>{self.reloadImage=true; self.onMouse({clientX:-2,clientY:-2,buttons:e.buttons});});
            self.canvasContext = self.canvas.getContext('2d', { willReadFrequently: true });

            //set default values
            self.setTool(self.curTool);
            self.tools["brush" ] = new Brush() ;
            self.tools["eraser"] = new Eraser();
            self.tools["bucket"] = new Bucket();

            //disables right click centext menu
            editorParent.addEventListener('contextmenu', event => event.preventDefault());
            
            //make ctr-s save resource pack
            document.addEventListener("keydown", function(e) {
                if ((navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
                    if (e.key === "s") {
                        e.preventDefault();
                        self.downloadPack("custom");
                        return;
                    } else if (e.key.toLowerCase() === "z") {
                        if (e.shiftKey)       self.redo();//ctrl+shift+z  redo
                        else                  self.undo();//ctrl+z        undo
                    } else if (e.key === "y") self.redo();//ctrl+y        redo
                    else if (e.key.toLowerCase() === "x" && e.shiftKey) self.clearActiveImage();
                }
                if (e.key === "p" || e.key === "b") self.setTool("brush");
                else if (e.key === "e") self.setTool("eraser");
                else if (e.key === "f") self.setTool("bucket");
                else if (e.key === "+" || e.key === "=") {
                    //zoom in
                    if (self.activeIndex==-1) return;
                    const {width,height,left,top} = self.canvasState;
                    self.canvasZoom({
                        clientX: self.editor.offsetLeft+left+width /2,
                        clientY: self.editor.offsetTop +top +height/2,
                        deltaY:1
                    });
                } else if (e.key === "-" || e.key === "_") {
                    //zoom out
                    if (self.activeIndex==-1) return;
                    const {width,height,left,top} = self.canvasState;
                    self.canvasZoom({
                        clientX: self.editor.offsetLeft+left+width /2,
                        clientY: self.editor.offsetTop +top +height/2,
                        deltaY:-1
                    });
                }
            }, false);
        })
    }
    
    //#region files/tabs
    /** 
     *  It will create a tab for the correspoding file passed in.
     *  @date 4/7/2023
     *
     *  @param file file to open
     */ 
    async openFile(file) {
        file = JSON.parse(decodeURIComponent(file));
        const {name,path,extention,properties} = file;
        //checks that the file is not already open
        for (let i = 0; i < self.opened.length; i++) {
            const openedFile = self.proccessedImages[self.opened[i]];
            if (openedFile.name == name && openedFile.path == path && openedFile.extention == extention && 
                openedFile.properties.width == properties.width && openedFile.properties.height == properties.height) {
                //if it find a tab matching the file switch to that tab
                for(let j = 0; j < self.fileTabs.children.length; j++) {
                    if (decodeURIComponent(self.fileTabs.children[j].id) == openedFile.path) {
                        self.selectTab(self.fileTabs.children[j]);
                    }
                }
                return;
            }
        }
        var tab;
        //if file extention is a png
        if (extention == ".png") {
            //add file to opened list
            const path = file.path;
            self.opened.push(path);
            if (self.proccessedImages[path] == null) {
                //get imgData array to be used by canvas
                properties.imgData = await util.getImagePixels(file);
                file.properties.modified = false;
                file.properties.strokes = 0;
                self.proccessedImages[path] = file;
            }
            //create tab html element
            tab = document.createElement("blk"); tab.className = "tab"; tab.id = encodeURIComponent(path); tab.setAttribute("selected",false);
            let text = document.createElement("blk"); text.innerHTML = spaces.two+name+spaces.one; text.setAttribute("onclick","canvas.selectTab(this.parentElement)");
            let button = document.createElement("button"); button.setAttribute("type","button"); button.className  = "closeButton"; button.setAttribute("onclick","canvas.closeTab(this.parentElement)");  button.innerHTML = Xicon;
            text = tab.appendChild(text); button = tab.appendChild(button);
        } else {
            console.log("currently unsupported \""+extention+"\" file");
        }
        self.mouse=[-2,-2,0];
        //append tab and set it as current open tab
        if (tab) { self.fileTabs.appendChild(tab); self.selectTab(tab); }
    }
    /**
     *  given a "blk.tab" element it selects the 
     *  file and displays it on the canvas.
     *  @date 4/7/2023
     *
     *  @param tab element passed in
     */ 
    selectTab(tab) {
        //loop through all tabs and set to not selected
        const allTabs = self.fileTabs.children;
        for(let i = 0; i < allTabs.length; i++) {
            allTabs[i].setAttribute("selected",false);
        }
        //set tab specified as selected
        tab.setAttribute("selected",true);
        //set the activeIndex variable correctly
        for(let i = 0; i < self.opened.length; i++) {
            const openedFile = self.proccessedImages[self.opened[i]];
            if (openedFile && openedFile.path == decodeURIComponent(tab.id)) {
                self.activeIndex = i; break;
            }
        }
        self.mouse=[-2,-2,0];
        self.reloadImage = true;
        self.update();
    }
    /**
     *  Given a "blk.tab" element it closes out the tab.
     *  If it was the active tab it selects the next tab it finds.
     *  @date 4/7/2023
     *
     *  @param tab element passed in
     */ 
    closeTab(tab) {
        //loop through currently opened files
        const id = decodeURIComponent(tab.id);
        for(let i = 0; i < self.opened.length; i++) {
            var openedFile = self.proccessedImages[self.opened[i]];
            //check if file matched element passed in
            if (openedFile.path == id) {
                delete self.opened[i];
                if (self.opened.length > 1) {
                    //if more files are still open
                    if (tab.getAttribute("selected")=="true") {
                        //if it is the currently opened tab get closest file
                        //and set activeIndex
                        if(i==self.opened.length-1) {i-=1; self.activeIndex = i; }
                        else { self.activeIndex = i; i++; }
                        openedFile = self.proccessedImages[self.opened[i]];
                        //find tab for coresponding file
                        var newChild = null;
                        for(let j = 0; j < self.fileTabs.children.length; j++) {
                            const child = self.fileTabs.children[j];
                            if (child!=tab&&decodeURIComponent(child.id) == openedFile.path) { newChild=child; }
                        }
                        self.opened = self.opened.filter((el)=>(el!=null&&el!=undefined));
                        self.selectTab(newChild);
                    } else {
                        //if it was not the selected tab just update activeIndex
                        self.opened = self.opened.filter((el)=>(el!=null&&el!=undefined));
                        for(let j = 0; j < self.fileTabs.children.length; j++) {
                            const tempTab = self.fileTabs.children[j];
                            //find the selected tab
                            if (tempTab.getAttribute("selected")=="true") {
                                //find associated file with tab
                                for(let l = 0; l < self.opened.length; l++) {
                                    if(decodeURIComponent(tempTab.id) == self.proccessedImages[self.opened[l]].path) {
                                        //set activeIndex
                                        self.activeIndex=l;
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                    }
                } else {
                    //if it is the last file open set activeIndex to -1
                    self.activeIndex=-1;self.opened = self.opened.filter((el)=>(el!=null&&el!=undefined));
                    this.update();
                }
            }
        }
        //delete tab and refresh canvas
        tab.parentElement.removeChild(tab);
        self.mouse=[-2,-2,0];
    }
    //#endregion

    //#region canvas
    /**
     *  updated the canvas to the state of the currently opened file
     *  @date 4/7/2023
     */ 
    async update() {
        //if there is a file currently open
        if (self.activeIndex == -1) { self.canvasContext.clearRect(0, 0, self.canvasState.width, self.canvasState.height); return; }
        const path = self.opened[self.activeIndex];
        const properties = self.proccessedImages[path].properties;
        var pixelSize;

        if (self.lastActivePath != path) {//if new file is opened
            self.lastActivePath = path;
            //scale image correctly
            const imgWidth = self.canvasState.imgWidth = properties.width;
            const imgHeight = self.canvasState.imgHeight = properties.height;
            //set the smaller side of texture to 256 and scale the other side to correct aspect ratio
            //unless the texture takes up too much of the screen in which case scale it down to not go off screen
            if (imgWidth >= imgHeight) {// width > height
                pixelSize = Math.min(256,(self.editor.clientWidth -32)/imgWidth *imgHeight)/imgHeight;
            } else {//                     height > width
                pixelSize = Math.min(256,(self.editor.clientHeight-32)/imgHeight*imgWidth )/imgWidth ;
            }
            pixelSize = Math.ceil(pixelSize*10)/10;
            const width = self.canvasState.width = self.canvas.width = imgWidth *pixelSize;
            const height = self.canvasState.height = self.canvas.height = imgHeight *pixelSize;

            //set in center of screen
            const left = self.canvasState.left = self.editor.clientWidth /2-width /2;
            const top  = self.canvasState.top  = self.editor.clientHeight/2-height/2;
            self.canvas.setAttribute("style","top:"+top+"px;left:"+left+"px;");
            //reset history( (ctrl-z)/(ctrl-y) wont work)
            self.strokeHistory     =[];
            self.strokeUndidHistory=[];
            //make image fully reload
            self.reloadImage=true;
        } else { pixelSize = self.canvasState.width/properties.width };
        
        const pixelsData = properties.imgData;
        if (pixelsData != null && pixelsData != undefined && pixelsData.length > 0) {
            //const start = new Date().getTime();
            const toolSize = self.tools[self.curTool].size||Math.max(properties.width,properties.height)*2;
            const toolWithinDist = Math.ceil(toolSize/2)+0.5;//distance to update within mouse
            const offset = ((toolSize+1)%2)/2;//slight optimization for moving mouse
            for (let x = 0; x < properties.width; x++) {
                for (let y = 0; y < properties.height; y++) {
                    //only refresh pixels around where the mouse is/was
                    const mouseDist     = [Math.abs(x-self.mouse[0]-offset    ), Math.abs(y-self.mouse[1]-offset    )];
                    const lastMouseDist = [Math.abs(x-self.lastMouse[0]-offset), Math.abs(y-self.lastMouse[1]-offset)];
                    if (self.reloadImage || (mouseDist[0]<=toolWithinDist && mouseDist[1]<=toolWithinDist) || (lastMouseDist[0]<=toolWithinDist && lastMouseDist[1]<=toolWithinDist)) {
                        const [newX, newY] = [x*pixelSize, y*pixelSize];
                        var [color,opacity] = pixelsData[x][y];
                        //only clear pixel if needed
                        if (opacity < 1) { self.canvasContext.clearRect(newX,newY,pixelSize,pixelSize); }
                        //draw pixel
                        self.canvasContext.fillStyle = "rgba("+color.join(",")+","+opacity+")";
                        self.canvasContext.fillRect(newX,newY,pixelSize,pixelSize);
                    }
                }
            }
            //console.log((self.reloadImage?"reloadImage:":"regular    :"),((new Date().getTime())-start)/1000);
            self.reloadImage = false;
        }
        if (self.mouse[0]>=0&&self.mouse[1]>=0) self.tools[self.curTool].drawOutline(self.canvasContext,self.mouse,self.canvasState);
    }
    onMouse(e) {
        if (self.activeIndex == -1) return;
        const {width,imgWidth,top,left} = self.canvasState;
        const pixelSize = width/imgWidth;

        self.lastMouse=self.mouse;
        self.mouse = [
            Math.floor(parseInt(e.clientX - self.editor.offsetLeft - left)/pixelSize),
            Math.floor(parseInt(e.clientY - self.editor.offsetTop - top)/pixelSize),
            e.buttons
        ];
        //if mouse is down
        if (self.mouse[2]==1) {
            const path = self.opened[self.activeIndex]
            const file = self.proccessedImages[path];
            const properties = file.properties;
            const [success, pixelsData] = self.tools[self.curTool].Draw(self.mouse, properties,self.currentStroke);
            if (success) {
                //if not already, set modified to true and set modified flag in file explorer
                if (!properties.modified) { properties.modified = true; document.getElementById(path).setAttribute("modified","true"); }
                properties.imgData = pixelsData;
                self.proccessedImages[path].properties = properties;
            }
        } else self.endStroke();
        self.update();
    }
    //#endregion

    //#region editor
    editorOnMouse(e) {
        if (self.activeIndex == -1) return;
        if (e.buttons != 1) self.endStroke();

        if (((e.buttons&2) == 2)) {
            const {width,imgWidth,top,left} = self.canvasState;
            const pixelSize = width/imgWidth;
            self.lastRightMouse=self.rightMouse;
            self.rightMouse = [
                Math.floor(parseInt(e.clientX - self.editor.offsetLeft - left)/pixelSize),
                Math.floor(parseInt(e.clientY - self.editor.offsetTop - top)/pixelSize),
                2
            ];
            //if right click is down
            if (((self.lastRightMouse[2]&2) == 2)) {
                //calculate how far it has moved from last movement
                const delta = [self.rightMouse[0]-self.lastRightMouse[0],self.lastRightMouse[1]-self.rightMouse[1]];
                if (delta[0]!=0||delta[1]!=0) {
                    self.canvasMove(delta);
                    //adjust mouse position to be correct for screen
                    self.rightMouse[0]-=delta[0];
                    self.rightMouse[1]+=delta[1];
                }
            }
        }
        self.rightMouse[2]=e.buttons;
    }
    canvasZoom(e) {
        if (self.activeIndex==-1) return;
        if (e.deltaY==0) return;
        const dir = e.deltaY/Math.abs(e.deltaY);
        var {width,height,imgWidth,top,left} = self.canvasState;
        const change = dir*Math.max(width/imgWidth*2,8);//2 image pixels or 8 screen pixels
        const aspect = height/width;
        const mouse = [(e.clientX-self.editor.offsetLeft-left),(e.clientY-self.editor.offsetTop-top)];

        //increase canvas width by "change" and make height match to aspect ratio
        self.canvasState.width = self.canvas.width = width-change;
        self.canvasState.height = self.canvas.height = (width-change)*aspect;
        //move canvas so mouse position will stay static
        left = self.canvasState.left = self.canvas.left = left+(change*mouse[0]/width);
        top = self.canvasState.top = self.canvas.top = top+(change*mouse[1]/width);
        self.canvas.setAttribute("style","top:"+top+"px;left:"+left+"px;");

        self.reloadImage=true;
        self.update();
    }
    canvasMove(delta) {
        if (self.activeIndex==-1) return;
        var {width,imgWidth,top,left} = self.canvasState;
        const pixelSize = width/imgWidth;
        //move canvas let/right and up/down in image pixel increments
        top = self.canvasState.top = (top-pixelSize*delta[1])||0;
        left = self.canvasState.left = (left+pixelSize*delta[0])||0;
        self.canvas.setAttribute("style","top:"+top+"px;left:"+left+"px;");

        self.reloadImage=true;
        self.update();
    }
    //#endregion

    //#region tools
    setTool(tool) {
        if (self.tools[tool] != null) {
            const children = self.toolsHtml.children;
            for (let i = 0; i < children.length; i++) {
                children[i].setAttribute("active",(children[i].id==tool));
            }
            const settingsChildren = self.toolSettings.children;
            for (let i = 0; i < settingsChildren.length; i++) {
                settingsChildren[i].setAttribute("active",(settingsChildren[i].id==tool));
            }
        } else { return; }
        self.curTool=tool;
    }
    setOption(tool, option, value) {
        if (self.tools[tool] != null) self.tools[tool].setOption(option,value);
    }
    async clearActiveImage() {
        if (self.activeIndex == -1) return;
        const file = self.proccessedImages[self.opened[self.activeIndex]];
        var properties = file.properties;
        var stroke = [];
        for (let x = 0; x < properties.width; x++) {
            for (let y = 0; y < properties.height; y++) {
                stroke.push([[x,y],file.properties.imgData[x][y]]);
            }
        }
        self.strokeHistory.push(stroke);
        self.strokeUndidHistory=[];
        properties.strokes++;

        file.properties.imgData = await util.getImagePixels(file);
        self.reloadImage=true;
        file.properties.modified = false;
        document.getElementById(file.path).setAttribute("modified","false");
        self.update();
    }

    async endStroke() {
        if (self.activeIndex == -1) return;
        if (self.currentStroke.length <= 0) return;
        //save stroke to array and clear "currentStroke" 
        self.strokeHistory.push(self.currentStroke);
        self.strokeUndidHistory=[];
        self.currentStroke=[];
        self.proccessedImages[self.opened[self.activeIndex]].properties.strokes++;
    }
    async undo() {
        if (self.activeIndex == -1) return;
        if (self.strokeHistory.length <= 0) return;
        //get last made change
        const stroke = self.strokeHistory.pop();
        //get opened file data
        var file = self.proccessedImages[self.opened[self.activeIndex]]
        var properties = file.properties;
        const pixelsData = properties.imgData;

        //undo changes made
        const undidStroke = [];
        for(let i = 0; i < stroke.length; i++) {
            const [[x,y],pixel] = stroke[i];
            const prevPixel = pixelsData[x][y];
            pixelsData[x][y] = pixel;
            undidStroke.push([[x,y],prevPixel])
        }
        //save stroke so it can be "redone"
        self.strokeUndidHistory.push(undidStroke)
        properties.strokes--;
        //set image as modified
        properties.modified = (properties.strokes>0);
        document.getElementById(file.path).setAttribute("modified",properties.modified);
        //make image fully reload
        properties.imgData = pixelsData;
        self.reloadImage=true;
        //update data in memory
        self.update();
    }
    async redo() {
        if (self.activeIndex == -1) return;
        if (self.strokeUndidHistory.length <= 0) return;
        //get last undo
        const stroke = self.strokeUndidHistory.pop();
        //get opened file data
        var file = self.proccessedImages[self.opened[self.activeIndex]];
        var properties = file.properties;
        const pixelsData = properties.imgData;

        //redo changes made
        const redidStroke = [];
        for(let i = 0; i < stroke.length; i++) {
            const [[x,y],pixel] = stroke[i];
            const prevPixel = pixelsData[x][y];
            pixelsData[x][y] = pixel;
            redidStroke.push([[x,y],prevPixel]);
        }
        //save stroke so it can be "undone" again
        self.strokeHistory.push(redidStroke);
        properties.strokes++;
        //set image as modified
        properties.modified = (properties.strokes>0);
        document.getElementById(file.path).setAttribute("modified",properties.modified);
        //make image fully reload
        self.reloadImage=true;
        properties.imgData = pixelsData;
        //update data in memory
        self.update();
    }
    //#endregion

    //#region download
    /**
     * gets the dataUrl base64 data from an file
     * @date 4/12/2023
     *
     * @param file file to get base64 data from
     */
    static getImageDataURL(file) {
        const properties = file.properties;
        var canv = document.createElement("canvas");
        //create canvas with size of image
        canv.width  = properties.width ;
        canv.height = properties.height;
        var ctx = canv.getContext('2d');
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
        return canv.toDataURL().replace("data:image/png;base64,","");
    }
    /**
     * Downloads the entire pack as a .zip
     * @date 4/11/2023
     *
     * @param packname name for the file being downloaded
     */
    async downloadPack(packname) {
        packname = packname||"pack";
            var zip = new JSZip();
            var folders = {parent:zip};
            var changedEntries = Object.entries(self.proccessedImages);
            for (let i = 0; i < changedEntries.length; i++) {
                const file = changedEntries[i][1];
                const {name,path,extention,properties} = file;
                if (!properties.modified) continue;
                //if file is a png
                if(extention == ".png"){
                    var split = path.split("/");
                    const filename = split.pop();//get rid of filename from end
                    split.shift();split.shift();//get rid of '' and 'minecraft' from front
                    var ongoingPath = "parent";
                    //add all folders needed
                    for (let j = 0; j < split.length; j++) {
                        const folder = split[j];
                        if (folders[ongoingPath+"/"+folder] == null) {
                            folders[ongoingPath+"/"+folder] = folders[ongoingPath].folder(folder);
                        }
                        ongoingPath+="/"+folder;
                    }
                    //add file
                    folders["parent/"+split.join("/")].file(filename, myCanvas.getImageDataURL(file), {base64: true});
                }
            }
            //add "pack.png" and "pack.mcmeta" files
            const packpng = await util.toDataURL("/minecraft/pack.png");
            const mcmeta = await util.fetchPromise("/minecraft/pack.mcmeta");
            zip.file("pack.png", packpng.replace("data:image/png;base64,",""), {base64: true});
            zip.file("pack.mcmeta", mcmeta);
            //generate zip and download it
            const zipContent = await zip.generateAsync({type:"blob"});
            saveAs(zipContent, packname+".zip");
    }
    //#endregion
}
//#region tool classes
function NotImplementedError(message = "") {
    this.name = "NotImplementedError";
    this.message = message;
}
NotImplementedError.prototype = new Error();
class Tool {
    constructor(){}
    drawOutline(canvasContext,mouse,canvasState) {
        throw NotImplementedError("\"drawOutline\" method not implemented yet"); 
    }
    setOption(option,value) {
        throw NotImplementedError("\"setOption\" method not implemented yet");
    }
    Draw() {
        throw NotImplementedError("\"setOption\" method not implemented yet");
    }
}
class Brush extends Tool {
    size = 1;
    transparency = 1;
    color = myCanvas.defaultColor;
    constructor() {
        super();
        document.getElementById("brushSize").value         = this.size;
        document.getElementById("brushTransparency").value = this.transparency*100;
        document.getElementById("brushColor").value      = util.RgbToHex(this.color);
    }
    drawOutline(canvasContext,mouse,canvasState) {
        const {width,imgWidth} = canvasState;
        const pixelSize = width/imgWidth;
        const subtract = Math.floor(this.size/2-0.49);

        canvasContext.strokeStyle = "#FFFFFF";
        canvasContext.beginPath();
        canvasContext.rect((mouse[0]-subtract)*pixelSize,(mouse[1]-subtract)*pixelSize, pixelSize*this.size, pixelSize*this.size);
        canvasContext.stroke();
    }
    setOption(option,value) {
        const mySwitch = {
            "size":(value)=>{
                value = document.getElementById("brushSize").value = Math.max(1,Number.parseInt(value));
                this.size = value;
            },
            "transparency":(value)=>{
                value = document.getElementById("brushTransparency").value = Math.max(0,Math.min(100,value));
                this.transparency = Math.round(Number.parseInt(value)/100*255)/255;
            },
            "color":(value)=>{
                document.getElementById("brushColor").value = value;
                value=value.replace("#","0x");
                this.color = [(value&0xFF0000)>>16,(value&0x00FF00)>>8,(value&0x0000FF)];
            }
        };
        (mySwitch[option]||(()=>{}))(value);
    }
    Draw(pos,properties,currentStroke) {
        const pixelsData = properties.imgData;

        const [bR,bG,bB] = this.color;
        const bA = this.transparency;
        if (bA <= 0) [false,pixelsData];

        const subtract = Math.floor(this.size/2-0.49);//amount to move left from mouse pos
        const add = this.size-subtract;//amount to move right
        for (let x = pos[0]-subtract; x < pos[0]+add; x++) {
            if (x < 0 || x >= properties.width) continue;
            for (let y = pos[1]-subtract; y < pos[1]+add; y++) {
                if (y < 0 || y >= properties.height) continue;
                //make sure you dont draw the same spot over and over again
                if (currentStroke.filter(el=>(el[0][0]==x&&el[0][1]==y)).length > 0) continue;

                //get current pixel
                const [[r,g,b],a] = pixelsData[x][y];
                //overlay with different transparencies
                //round to nearest integer
                pixelsData[x][y] = [
                    [Math.round((r*a*(1-bA)+bR*bA)),
                    Math.round( (g*a*(1-bA)+bG*bA)),
                    Math.round( (b*a*(1-bA)+bB*bA))],
                    Math.round( (a  *(1-bA)+bA   )*255)/255
                ];
                currentStroke.push([[x,y],[[r,g,b],a]]);
            }
        }
        return [true,pixelsData];
    }
}
class Eraser extends Tool {
    size = 1;
    hardness = 1;
    constructor() {
        super();
        document.getElementById("eraserSize").value      = this.size;
        document.getElementById("eraserHardness").value  = (this.hardness*100);
    }
    drawOutline(canvasContext,mouse,canvasState) {
        const {width,imgWidth} = canvasState;
        const pixelSize = width/imgWidth;
        const subtract = Math.floor(this.size/2-0.49);

        canvasContext.strokeStyle = "#FFFFFF";
        canvasContext.beginPath();
        canvasContext.rect((mouse[0]-subtract)*pixelSize,(mouse[1]-subtract)*pixelSize, pixelSize*this.size, pixelSize*this.size);
        canvasContext.stroke();
    }
    setOption(option,value) {
        const mySwitch = {
            "size":(value)=>{
                value = document.getElementById("penTransparency").value = Math.max(1,Number.parseInt(value));
                this.size = value;
            },
            "hardness":(value)=>{
                value = document.getElementById("eraserHardness").value = Math.max(0,Math.min(100,Number.parseInt(value)));
                this.hardness = value/100;
            }
        };
        (mySwitch[option]||(()=>{}))(value);
    }
    Draw(pos,properties,currentStroke) {
        var pixelsData = properties.imgData;
        const subtract = Math.floor(this.size/2-0.49);//amount to move left from mouse pos
        const add = this.size - subtract;//amount to move right

        for (let x = Math.min(pos[0]-subtract); x < pos[0]+add; x++) {
            if (x < 0 || x >= properties.width) continue;
            for (let y = pos[1]-subtract; y < pos[1]+add; y++) {
                if (y < 0 || y >= properties.height) continue;
                //make sure you dont erase the same spot over and over again
                if (currentStroke.filter(el=>(el[0][0]==x&&el[0][1]==y)).length > 0) continue;

                const [color,alpha] = pixelsData[x][y];
                pixelsData[x][y][1] = Math.round(alpha*(1-this.hardness)*255)/255;
                currentStroke.push([[x,y],[color,alpha]]);
            }
        }
        return [true,pixelsData];
    }
}
class Bucket extends Tool {
    color = myCanvas.defaultColor;
    transparency = 1;
    constructor() {
        super();
        document.getElementById("bucketColor").value      = util.RgbToHex(this.color);
        document.getElementById("bucketTransparency").value = this.transparency*100;
    }
    drawOutline(canvasContext,mouse,canvasState) {}
    setOption(option,value) {
        const mySwitch = {
            "color":(value)=>{
                document.getElementById("bucketColor").value = value;
                value=value.replace("#","0x");
                this.color = [(value&0xFF0000)>>16,(value&0x00FF00)>>8,(value&0x0000FF)];
            },
            "transparency":(value)=>{
                value = document.getElementById("bucketTransparency").value = Math.max(0,Math.min(100,value));
                this.transparency = Math.round(Number.parseInt(value)/100*255)/255;
            }
        };
        (mySwitch[option]||(()=>{}))(value);
    }
    Draw(pos,properties,currentStroke,parentPixel) {
        var pixelsData = properties.imgData;
        const [x,y] = pos;
        if (x < 0 || x >= properties.width) return [false,pixelsData];
        if (y < 0 || y >= properties.height) return [false,pixelsData];
        //make sure you dont draw the same spot over and over again
        if (currentStroke.filter(el=>(el[0][0]==x&&el[0][1]==y)).length > 0) return [false,pixelsData];
        //get bucket settings
        const [bR,bG,bB] = this.color;
        const bA = this.transparency;

        const [[r,g,b],a] = pixelsData[x][y];
        if (parentPixel) {
            const [[Pr,Pg,Pb],Pa] = parentPixel;
            if (Pr!=r||Pg!=g||Pb!=b||Pa!=a){ return [false,pixelsData]; }
        }
        if (r==bR&&g==bG&&b==bB&&a==bA) return [true,pixelsData];//just return if bucket color and pixel color are the same
        
        //overlay with different transparencies
        //round to nearest integer
        pixelsData[x][y] = [
            [Math.round((r*a*(1-bA)+bR*bA)),
            Math.round( (g*a*(1-bA)+bG*bA)),
            Math.round( (b*a*(1-bA)+bB*bA))],
            Math.round( (a  *(1-bA)+bA   )*255)/255
        ];
        pixelsData[x][y] = [[Math.round(bR),Math.round(bG),Math.round(bB)],Math.round(bA*255)/255];
        currentStroke.push([[x,y],[[r,g,b],a]]);

        //overlay with different transparencies
        //round to nearest integer
        pixelsData = this.Draw([pos[0]  ,pos[1]+1],properties,currentStroke,[[r,g,b],a])[1];
        pixelsData = this.Draw([pos[0]+1,pos[1]  ],properties,currentStroke,[[r,g,b],a])[1];
        pixelsData = this.Draw([pos[0]  ,pos[1]-1],properties,currentStroke,[[r,g,b],a])[1];
        pixelsData = this.Draw([pos[0]-1,pos[1]  ],properties,currentStroke,[[r,g,b],a])[1];
        return [true,pixelsData];
    }
}
//#endregion