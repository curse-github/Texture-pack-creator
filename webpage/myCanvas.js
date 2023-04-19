class myCanvas {

    //#region vars
    //constant
    self;
    static validTools = ["brush","eraser"];

    //html elements
    editorParent;
    editor;
    fileTabs;
    canvas;
    canvasContext;
    tools;
    toolOptions;

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
    curTool;
    toolSettings;
    currentStroke = [];
    reloadImage = false;
    canvasState = {
        width:0,
        height:0,
        imgWidth:0,
        imgHeight:0,
        top:0,
        left:0
    }
    //#endregion

    constructor() {
        self = this;

        this.curTool = "brush";
        this.toolOptions = {
            "brush":{
                "size":1,
                "brushColor":[127,0,127],
                "penTransparency":1
            },
            "eraser":{
                "size":1,
                "eraserHardness":1
            }
        };

        window.addEventListener("load", (e) => {
            self.editorParent  = document.getElementById("editorParent" );
            self.fileTabs      = document.getElementById("fileTabs"     );
            self.tools = document.getElementById("tools");
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
            document.getElementById("penSize").value         = self.toolOptions.brush.size;
            document.getElementById("eraserSize").value      = self.toolOptions.eraser.size;
            document.getElementById("brushColor").value      = util.RgbToHex(self.toolOptions.brush.brushColor);
            document.getElementById("penTransparency").value = self.toolOptions.brush.penTransparency*100;
            document.getElementById("eraserHardness").value  = self.toolOptions.eraser.eraserHardness*100;

            //disables right click centext menu
            editorParent.addEventListener('contextmenu', event => event.preventDefault());
            
            //make ctr-s save resource pack
            document.addEventListener("keydown", function(e) {
                if (e.key === "s" && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
                    e.preventDefault();
                    self.downloadPack("custom");
                } else if (e.key === "p" || e.key === "b") {
                    self.setTool("brush");
                } else if (e.key === "e") {
                    self.setTool("eraser");
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

        //set the smaller side of texture to 256 and scale the other side to correct aspect ratio
        //unless the texture takes up too much of the screen in which case scale it down to not go off screen
        if (self.lastActivePath != path) {//if new file is opened
            self.lastActivePath = path;
            const imgWidth = self.canvasState.imgWidth = properties.width;
            const imgHeight = self.canvasState.imgHeight = properties.height;
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
            self.reloadImage=true;
        } else { pixelSize = self.canvasState.width/properties.width };
        
        const pixelsData = properties.imgData;
        if (pixelsData != null && pixelsData != undefined && pixelsData.length > 0) {
            //const start = new Date().getTime();
            const toolSize = self.toolOptions[self.curTool].size;
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

        //draw pixel outline around brush
        const toolSize = self.toolOptions[self.curTool].size;
        const subtract = Math.floor(toolSize/2-0.49);
        self.canvasContext.strokeStyle = "#FFFFFF";
        self.canvasContext.beginPath();
        self.canvasContext.rect((self.mouse[0]-subtract)*pixelSize,(self.mouse[1]-subtract)*pixelSize,pixelSize*toolSize,pixelSize*toolSize);
        self.canvasContext.stroke();
    }
    onMouse(e) {
        if (self.activeIndex == -1) return;
        const file = self.proccessedImages[self.opened[self.activeIndex]];
        const properties = file.properties;
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
            if (self.curTool=="brush") {
                //draw pixel at mouse pos
                const pixelsData = properties.imgData;

                //brush settings
                const [bR,bG,bB] = self.toolOptions.brush.brushColor;
                const bA = self.toolOptions.brush.penTransparency;
                const brushSize = self.toolOptions.brush.size;

                const subtract = Math.floor(brushSize/2-0.49);//amount to move left from mouse pos
                const add = brushSize-subtract;//amount to move right
                for (let x = self.mouse[0]-subtract; x < self.mouse[0]+add; x++) {
                    if (x < 0 || x >= properties.width) continue;
                    for (let y = self.mouse[1]-subtract; y < self.mouse[1]+add; y++) {
                        if (y < 0 || y >= properties.height) continue;
                        //make sure you dont draw the same spot over and over again
                        if (self.currentStroke.filter(el=>(el[0]==x&&el[1]==y)).length > 0) continue;
                        self.currentStroke.push([x,y]);

                        //get current pixel
                        const [[r,g,b],a] = pixelsData[x][y];
                        //overlay with different transparencies
                        //round to nearest integer
                        pixelsData[x][y] = [
                            [Math.round( r*a*(1-bA)+bR*bA),
                            Math.round( g*a*(1-bA)+bG*bA),
                            Math.round( b*a*(1-bA)+bB*bA)],
                            Math.round( a*(1-bA)+bA *255)/255
                        ];
                        console.log(pixelsData[x][y][0][2])
                    }
                }
                //if not already, set modified to true and set modified flag in file explorer
                if (!properties.modified) { properties.modified = true; document.getElementById(file.path).setAttribute("modified","true"); }
                properties.imgData = pixelsData;
            } else if (self.curTool=="eraser") {
                const pixelsData = properties.imgData;
                const eraserSize = self.toolOptions.eraser.size;
                const hardness = 1-self.toolOptions.eraser.eraserHardness;

                const subtract = Math.floor(eraserSize/2-0.49);//amount to move left from mouse pos
                const add = eraserSize - subtract;//amount to move right
                for (let x = self.mouse[0]-subtract; x < self.mouse[0]+add; x++) {
                    for (let y = self.mouse[1]-subtract; y < self.mouse[1]+add; y++) {
                        //make sure you dont erase the same spot over and over again
                        if (self.currentStroke.filter(el=>(el[0]==x&&el[1]==y)).length > 0) continue;
                        self.currentStroke.push([x,y]);
                        pixelsData[x][y][1] = Math.round(pixelsData[x][y][1]*hardness*255)/255;
                    }
                }
                //if not already, set modified to true and set modified flag in file explorer
                if (!properties.modified) { properties.modified = true; document.getElementById(file.path).setAttribute("modified","true"); }
                properties.imgData = pixelsData;
            }
        } else self.currentStroke=[];//end stroke
        self.update();
    }
    //#endregion

    //#region editor
    editorOnMouse(e) {
        if (self.activeIndex == -1) return;
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
            } else self.currentStroke=[];
        } else self.rightMouse[2]=e.buttons;
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
        if (myCanvas.validTools.includes(tool)) {
            const children = tools.children;
            for (let i = 0; i < children.length; i++) {
                children[i].setAttribute("active",(children[i].id==tool));
            }
            const settingsChildren = toolSettings.children;
            for (let i = 0; i < settingsChildren.length; i++) {
                settingsChildren[i].setAttribute("active",(settingsChildren[i].id==tool));
            }
        } else { return; }
        self.curTool=tool;
    }
    setOption(tool, option, value) {
        //convert #FF0000 to [255,0,0]
        if ((typeof value) == "string" && value.startsWith("#") && value.length==7) {
            value=value.replace("#","0x");
            self.toolOptions[tool][option] = [(value&0xFF0000)>>16,(value&0x00FF00)>>8,(value&0x0000FF)];
        } else {
            self.toolOptions[tool][option] = Number.parseFloat(value);
        }
    }
    async clearActiveImage() {
        if (self.activeIndex == -1) return;
        const file = self.proccessedImages[self.opened[self.activeIndex]];
        file.properties.modified = false;
        file.properties.imgData = await util.getImagePixels(file);
        self.reloadImage=true;
        document.getElementById(file.path).setAttribute("modified","false");
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