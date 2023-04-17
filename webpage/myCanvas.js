class myCanvas {
    //constant
    static validTools = ["brush","eraser"];

    //html elements
    editorParent;
    editor;
    canvas;
    canvasContext;

    //opened files/data
    opened = [];
    proccessedImages = {};
    activeIndex = -1;
    lastActiveIndex = -2;

    mouse=[-2,-2,0];
    //settings
    curTool;
    toolOptions;
    lastClick = 0;
    lastRcScreenPos = [-1,-1];
    lastMouse = this.mouse;
    currentStroke = [];
    reloadImage = false;

    self;

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
            self.editor        = document.getElementById("editor"       );
            self.editor.addEventListener("wheel", (e)=>{if (e.deltaY!=0){self.canvasZoom(e.deltaY/Math.abs(e.deltaY))}});
            self.canvas        = document.getElementById("canvas"       );
            self.canvas.onmousemove = self.onMouse;
            self.canvas.onmousedown = self.onMouse;
            self.canvas.onmouseup   = self.onMouse;
            self.canvas.onmouseleave = ((e)=>{self.reloadImage=true; self.onMouse({ClientX:-2,ClientY:-2,buttons:e.buttons});});
            self.canvasContext = self.canvas.getContext('2d', { willReadFrequently: true });
            document.addEventListener("resize", self.update);

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
        //if file extention is a png
        var tab;
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
            //append it to parent
            tab  = self.fileTabs.appendChild(tab);
        } else {
            console.log("currently unsupported \""+extention+"\" file");
        }
        self.mouse=[-2,-2,0];
        //set tab as current active tab
        if (tab) { self.selectTab(tab); }
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
                        console.log(newChild)
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
                    self.activeIndex=-1;self.lastActiveIndex=-2;self.opened = self.opened.filter((el)=>(el!=null&&el!=undefined));
                    this.update();
                }
            }
        }
        //delete tab and refresh canvas
        tab.parentElement.removeChild(tab);
        self.mouse=[-2,-2,0];
    }
    //#endregion

    /**
     *  updated the canvas to the state of the currently opened file
     *  @date 4/7/2023
     */ 
    async update() {
        //if there is a file currently open
        if (self.activeIndex == -1) { self.canvasContext.clearRect(0, 0, self.canvas.width, self.canvas.height); return; }
        const file = self.proccessedImages[self.opened[self.activeIndex]];
        if (!file) console.log(self.opened)
        const properties = file.properties;
        var pixelSize = 1;
        //set the smaller side of texture to 256 and scale the other side to correct aspect ratio
        //unless the texture takes up too much of the screen in which case scale it to not go off screen
        if (self.lastActiveIndex != self.activeIndex) {
            self.lastActiveIndex = self.activeIndex;
            if (properties.width >= properties.height) {
                pixelSize = Math.ceil(Math.min(256,self.editor.clientWidth /properties.width *properties.height-7.5)/properties.height);
            } else {// properties.height > properties.width
                pixelSize = Math.ceil(Math.min(256,self.editor.clientHeight/properties.height*properties.width -7.5)/properties.width );
            }
            self.canvas.width  = properties.width *pixelSize;
            self.canvas.height = properties.height*pixelSize;
        } else { pixelSize = self.canvas.width/properties.width };
        const pixelSizeCeil = Math.ceil(pixelSize);
        //clear canvas
        
        const pixelsData = properties.imgData;
        if (pixelsData != null && pixelsData != undefined && pixelsData.length > 0) {
            let count = 0;
            const start = new Date().getTime();
            for (let x = 0; x < properties.width; x++) {
                for (let y = 0; y < properties.height; y++) {
                    const newX = x*pixelSize;
                    const newY = y*pixelSize;
                    const pixel = pixelsData[x][y];
                    const opacity = pixel[1];
                    const color = "rgba("+pixel[0].join(",")+","+opacity+")";
                    //draw pixels individually from data
                    const withinDist = (Math.ceil(self.toolOptions[self.curTool].size/2)+1);
                    const withinMousePos = (Math.abs(self.mouse[0]-x)<=withinDist && Math.abs(self.mouse[1]-y)<=withinDist)
                    const withinLastMousePos = (Math.abs(self.lastMouse[0]-x)<=withinDist && Math.abs(self.lastMouse[1]-y)<=withinDist)
                    if (self.reloadImage || withinMousePos || withinLastMousePos) {
                        count++;
                        if (opacity < 1) { self.canvasContext.clearRect(newX,newY,pixelSizeCeil,pixelSizeCeil); }
                        self.canvasContext.fillStyle = color;
                        self.canvasContext.fillRect(newX,newY,pixelSizeCeil,pixelSizeCeil);
                    }
                }
            }
            //console.log("count:" + count);
            console.log((self.reloadImage?"reloadImage:":"regular    :"),((new Date().getTime())-start)/1000);
            self.reloadImage = false;
        }
        const toolSize = self.toolOptions[self.curTool].size;
        const subtract = Math.floor(toolSize/2-0.49);
        //draw pixel outline around brush
        self.canvasContext.strokeStyle = "#FFFFFF";
        self.canvasContext.beginPath();
        self.canvasContext.rect((self.mouse[0]-subtract)*pixelSize,(self.mouse[1]-subtract)*pixelSize,pixelSize*toolSize,pixelSize*toolSize);
        self.canvasContext.stroke();
    }
    onMouse(e) {
        if (self.activeIndex == -1) return;
        const file = self.proccessedImages[self.opened[self.activeIndex]];
        const properties = file.properties;
    
        var mouseX = parseInt(e.clientX - self.canvas.offsetLeft);
        var mouseY = parseInt(e.clientY - self.canvas.offsetTop);
        self.lastMouse=self.mouse;
        self.mouse = [Math.floor(mouseX/self.canvas.width*properties.width),Math.floor(mouseY/self.canvas.height*properties.height),e.buttons];
        //if mouse is down
        if (self.mouse[2]==1) {
            if (self.curTool=="brush") {
                //draw pixel at mouse pos
                const subtract = Math.floor(self.toolOptions.brush.size/2-0.49);
                const add = self.toolOptions.brush.size-subtract;
                const pixelsData = properties.imgData;
                for (let x = self.mouse[0]-subtract; x < self.mouse[0]+add; x++) {
                    if (x < 0 || x >= properties.width) continue;
                    for (let y = self.mouse[1]-subtract; y < self.mouse[1]+add; y++) {
                        if (y < 0 || y >= properties.height) continue;
                        //make sure you dont erase the same spot over and over when youre not trying to
                        if (self.currentStroke.filter(el=>(el[0]==x&&el[1]==y)).length > 0) continue;
                        self.currentStroke.push([x,y]);
                        
                        //get brush settings
                        const [bR,bG,bB] = self.toolOptions.brush.brushColor;
                        const bA = self.toolOptions.brush.penTransparency;
                        if (pixelsData[x][y] != null && pixelsData[x][y] != undefined) {
                            //get current pixel
                            var pixel = pixelsData[x][y];
                            const [r,g,b] = pixel[0];
                            const a = pixel[1];
                            //overlay with different transparencies
                            pixel = [[r*a*(1-bA)+bR*bA,g*a*(1-bA)+bG*bA,b*a*(1-bA)+bB*bA],a*(1-bA)+bA];
                            //to the closest out of 255
                            pixel[0].map(el=>Math.round(el*255)/255);
                            pixel[1] = Math.round(pixel[1]*255)/255;
                            pixelsData[x][y] = pixel;
                            continue;
                        }
                        pixelsData[x][y] = [[bR,bG,bB],bA];
                    }
                }
                if (!properties.modified) { properties.modified = true; document.getElementById(file.path).setAttribute("modified","true"); }
                properties.imgData = pixelsData;
            } else if (self.curTool=="eraser") {
                const pixelsData = properties.imgData;
                const subtract = Math.floor(self.toolOptions.eraser.size/2-0.49);
                const add = self.toolOptions.eraser.size - subtract;
                const hardness = 1-self.toolOptions.eraser.eraserHardness;
                for (let x = self.mouse[0]-subtract; x < self.mouse[0]+add; x++) {
                    for (let y = self.mouse[1]-subtract; y < self.mouse[1]+add; y++) {
                        //make sure you dont erase the same spot over and over when youre not trying to
                        if (self.currentStroke.filter(el=>(el[0]==x&&el[1]==y)).length > 0) continue;
                        self.currentStroke.push([x,y]);
    
                        //to the closest out of 255
                        if (pixelsData[x]!=null && pixelsData[x][y]!=null) { pixelsData[x][y][1] = Math.round(pixelsData[x][y][1]*hardness*255)/255; }
                    }
                }
                if (!properties.modified) { properties.modified = true; document.getElementById(file.path).setAttribute("modified","true"); }
                properties.imgData = pixelsData;
            }
            file.properties = properties;
            self.proccessedImages[self.opened[self.activeIndex]] = file;
            self.lastClick = 1;
        } else if (self.mouse[2]==2||self.mouse[2]==3) {
            //end stroke
            self.currentStroke=[];
            if (self.lastClick == 2) {
                var delta = [self.mouse[0]-self.lastRcScreenPos[0],self.lastRcScreenPos[1]-self.mouse[1]];
                if (delta[0]!=0||delta[1]!=0) console.log(delta);
            }
    
            self.lastRcScreenPos = [self.mouse[0],self.mouse[1]]; self.lastClick = 2;
        } else {
            //end stroke and end drag
            self.lastClick = 3; self.currentStroke=[];
        }
        self.update();
    }
    canvasZoom(dir) {
        const aspect = self.canvas.height/self.canvas.width;
        self.canvas.width -= dir*16;
        self.canvas.height = self.canvas.width*aspect;
        self.reloadImage=true;
        self.update();
    }
    setTool(tool) {
        if (myCanvas.validTools.includes(tool)) {
            const children = document.getElementById("tools").children;
            for (let i = 0; i < children.length; i++) {
                children[i].setAttribute("active",(children[i].id==tool));
            }
            const settingsChildren = document.getElementById("toolOptions").children;
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
            value = [(value&0xFF0000)>>16,(value&0x00FF00)>>8,(value&0x0000FF)];
        }
        self.toolOptions[tool][option] = value;
    }
    async clearActiveImage() {
        if (self.activeIndex == -1) return;
        const file = self.proccessedImages[self.opened[self.activeIndex]];
        const properties = file.properties;
        properties.modified = false;
        properties.imgData = await util.getImagePixels(file);
        self.reloadImage=true;
        document.getElementById(file.path).setAttribute("modified","false");
        self.update();
    }


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
}