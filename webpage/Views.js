class View {
    editor;
    reloadImage = true;
    constructor(){
        this.editor = document.getElementById("editor");
    }
    resizeCanvas() {
        throw NotImplementedError("\"resizeCanvas\" method not implemented yet");
    }
    updateCanvas() {
        throw NotImplementedError("\"updateCanvas\" method not implemented yet");
    }
    clearCanvas() {
        throw NotImplementedError("\"clearCanvas\" method not implemented yet");
    }
    mapMouse() {
        throw NotImplementedError("\"mapMouse\" method not implemented yet");
    }
}
class Single extends View {
    constructor() {
        super()
    }
    resizeCanvas(activeIndex,canvasContext,canvasState,opened,proccessedImages,canvas,strokeHistory,strokeUndidHistory) {
        //if there is a file currently open
        if (activeIndex == -1) { this.clearCanvas(canvasContext,canvasState); return; }
        const path = opened[activeIndex];
        const properties = proccessedImages[path].properties;
        var pixelSize;

        //scale image correctly
        const imgWidth = canvasState.imgWidth = properties.width;
        const imgHeight = canvasState.imgHeight = properties.height;
        //set the smaller side of texture to 256 and scale the other side to correct aspect ratio
        //unless the texture takes up too much of the screen in which case scale it down to not go off screen
        if (imgWidth >= imgHeight) {// width > height
            pixelSize = Math.min(256,(this.editor.clientWidth -32)/imgWidth *imgHeight)/imgHeight;
        } else {//                     height > width
            pixelSize = Math.min(256,(this.editor.clientHeight-32)/imgHeight*imgWidth )/imgWidth ;
        }
        //pixelSize = Math.ceil(pixelSize*10)/10;
        const width =  canvasState.width  = canvas.width  = imgWidth *pixelSize;
        const height = canvasState.height = canvas.height = imgHeight*pixelSize;

        //set in center of screen
        var left = canvasState.left = this.editor.clientWidth /2-width /2;
        var top  = canvasState.top  = this.editor.clientHeight/2-height/2;

        canvas.setAttribute("style","top:"+top+"px;left:"+left+"px;");

        //reset history( (ctrl-z)/(ctrl-y) wont work)
        strokeHistory      = [];
        strokeUndidHistory = [];
        //make image fully reload
        this.reloadImage=true;
    }
    updateCanvas(activeIndex,canvasContext,canvasState,opened,proccessedImages,tools,curTool,mouse,lastMouse) {
        //if there is a file currently open
        if (activeIndex == -1) { this.clearCanvas(canvasContext,canvasState); return; }
        const path = opened[activeIndex];
        const properties = proccessedImages[path].properties;
        const pixelSize = canvasState.width/properties.width;
        
        const pixelsData = properties.imgData;
        if (pixelsData != null && pixelsData != undefined && pixelsData.length > 0) {
            //const start = new Date().getTime();
            const toolSize = tools[curTool].size||Math.max(properties.width,properties.height)*2;
            const toolWithinDist = Math.ceil(toolSize/2)+0.5;//distance to update within mouse
            const offset = ((toolSize+1)%2)/2;//slight optimization for moving mouse
            for (let x = 0; x < properties.width; x++) {
                for (let y = 0; y < properties.height; y++) {
                    //only refresh pixels around where the mouse is/was
                    const mouseDist     = [Math.abs(x-mouse[0]-offset    ), Math.abs(y-mouse[1]-offset    )];
                    const lastMouseDist = [Math.abs(x-lastMouse[0]-offset), Math.abs(y-lastMouse[1]-offset)];
                    if (this.reloadImage || (mouseDist[0]<=toolWithinDist && mouseDist[1]<=toolWithinDist) || (lastMouseDist[0]<=toolWithinDist && lastMouseDist[1]<=toolWithinDist)) {
                        var [color,opacity] = pixelsData[x][y];
                        //only clear pixel if needed
                        //draw pixel
                        canvasContext.fillStyle = "rgba("+color.join(",")+","+opacity+")";
                        const [newX, newY] = [x*pixelSize, y*pixelSize];
                        if (opacity < 1) canvasContext.clearRect(newX,newY,pixelSize,pixelSize);
                        canvasContext.fillRect(newX,newY,pixelSize,pixelSize);
                    }
                }
            }
            //console.log((this.reloadImage?"reloadImage:":"regular    :"),((new Date().getTime())-start)/1000);
            this.reloadImage = false;
        }
        if (mouse[0]>=0&&mouse[1]>=0) tools[curTool].drawOutline(canvasContext,mouse,canvasState);
    }
    clearCanvas(canvasContext,canvasState) {
        canvasContext.clearRect(0, 0, canvasState.width, canvasState.height);
    }
    mapMouse(mouse,activeIndex,opened) {
        var {width,imgWidth,top,left} = self.canvasState;
        const pixelSize = width/imgWidth;
        const newMouse = [
            Math.floor((parseInt(mouse[0]) - this.editor.offsetLeft - left)/pixelSize),
            Math.floor((parseInt(mouse[1]) - this.editor.offsetTop  - top )/pixelSize),
            mouse[2]
        ];
        const path = opened[activeIndex];
        return [newMouse,path];
    }
    setSize(change, mouse,activeIndex,opened, canvasState,canvas) {
        var {width,height,top,left} = canvasState;
        const newMouse = [
            (mouse[0] - this.editor.offsetLeft - left),
            (mouse[1] - this.editor.offsetTop  - top )
        ];
        const aspect = height/width;
        
        //increase canvas width by "change" and make height match to aspect ratio
        canvasState.width = canvas.width = (width-change);
        canvasState.height = canvas.height = (width-change)*aspect;

        //move canvas so mouse position will stay static
        left=canvasState.left = left+(change*newMouse[0]/width);
        top =canvasState.top  = top +(change*newMouse[1]/width);
        canvas.setAttribute("style","top:"+top+"px;left:"+left+"px;");
    }
}
class Tile extends View {
    constructor() {
        super()
    }
    resizeCanvas(activeIndex,canvasContext,canvasState,opened,proccessedImages,canvas,strokeHistory,strokeUndidHistory) {
        //if there is a file currently open
        if (activeIndex == -1) { this.clearCanvas(canvasContext,canvasState); return; }
        const path = opened[activeIndex];
        const properties = proccessedImages[path].properties;
        var pixelSize;

        //scale image correctly
        const imgWidth  = canvasState.imgWidth  = properties.width;
        const imgHeight = canvasState.imgHeight = properties.height;
        //set the smaller side of texture to 256 and scale the other side to correct aspect ratio
        //unless the texture takes up too much of the screen in which case scale it down to not go off screen
        if (imgWidth >= imgHeight) {// width  > height
            pixelSize = Math.min(256,(this.editor.clientWidth -32)/imgWidth *imgHeight)/imgHeight;
        } else {//                     height > width 
            pixelSize = Math.min(256,(this.editor.clientHeight-32)/imgHeight*imgWidth )/imgWidth ;
        }
        //pixelSize = Math.ceil(pixelSize*10)/10;
        const width   = canvasState.width  = imgWidth *pixelSize;
        const height  = canvasState.height = imgHeight*pixelSize;
        canvas.width  = width *3;
        canvas.height = height*3;

        //set in center of screen
        var left = canvasState.left = this.editor.clientWidth /2-width *1.5;
        var top  = canvasState.top  = this.editor.clientHeight/2-height*1.5
        canvas.setAttribute("style","top:"+top+"px;left:"+left+"px;");

        //make image fully reload
        this.reloadImage=true;
    }
    updateCanvas(activeIndex,canvasContext,canvasState,opened,proccessedImages,tools,curTool,mouse,lastMouse) {
        //if there is a file currently open
        if (activeIndex == -1) { this.clearCanvas(canvasContext,canvasState); return; }
        const path = opened[activeIndex];
        const properties = proccessedImages[path].properties;
        const pixelSize = canvasState.width/properties.width;
        
        const pixelsData = properties.imgData;
        if (pixelsData != null && pixelsData != undefined && pixelsData.length > 0) {
            //const start = new Date().getTime();
            const toolSize = tools[curTool].size||Math.max(properties.width,properties.height)*2;
            const toolWithinDist = Math.ceil(toolSize/2)+0.5;//distance to update within mouse
            const offset = ((toolSize+1)%2)/2;//slight optimization for moving mouse
            for (let x = 0; x < properties.width; x++) {
                for (let y = 0; y < properties.height; y++) {
                    const {width,height}=properties;
                    //only refresh pixels around where the mouse is/was
                    const mouseDist = ((Math.abs((mouse[0]-x+width*1.5)%width-width/2+offset)<=toolWithinDist)&&(Math.abs((mouse[1]-y+height*1.5)%height-height/2+offset)<=toolWithinDist));
                    const lastMouseDist = ((Math.abs((lastMouse[0]-x+width*1.5)%width-width/2+offset)<=toolWithinDist)&&(Math.abs((lastMouse[1]-y+height*1.5)%height-height/2+offset)<=toolWithinDist));
                    if (this.reloadImage || mouseDist || lastMouseDist) {
                        var [color,opacity] = pixelsData[x][y];
                        //only clear pixel if needed
                        //draw pixel
                        canvasContext.fillStyle = "rgba("+color.join(",")+","+opacity+")";
                        var positions = [
                            [0,0],
                            [1,0],
                            [2,0],
                            [0,1],
                            [1,1],
                            [2,1],
                            [0,2],
                            [1,2],
                            [2,2],
                        ];
                        positions = positions.map(([right, down])=>[ Math.floor((x+properties.width*right)*pixelSize), Math.floor((y+properties.height*down)*pixelSize) ]);
                        if (opacity < 1) {
                            positions.forEach(([newX, newY]) => {
                                canvasContext.clearRect(newX, newY,Math.ceil(pixelSize),Math.ceil(pixelSize));
                            });
                        }
                        positions.forEach(([newX, newY]) => {
                            canvasContext.fillRect(newX, newY,Math.ceil(pixelSize),Math.ceil(pixelSize));
                        });
                    }
                }
            }
            //console.log((this.reloadImage?"reloadImage:":"regular    :"),((new Date().getTime())-start)/1000);
            this.reloadImage = false;
        }
        if (mouse[0]>=0&&mouse[1]>=0) {
            var positions = [
                [0,0],
                [1,0],
                [2,0],
                [0,1],
                [1,1],
                [2,1],
                [0,2],
                [1,2],
                [2,2],
            ];
            positions = positions.map(([right, down])=>[ mouse[0]+properties.width*right, mouse[1]+properties.height*down ]);
            positions.forEach(([x,y]) => {
                tools[curTool].drawOutline(canvasContext,[x,y],canvasState);
            });
        }
    }
    clearCanvas(canvasContext,canvasState) {
        canvasContext.clearRect(0, 0, canvasState.width*3, canvasState.height*3);
    }
    mapMouse(mouse,activeIndex,opened) {
        const {width,imgWidth,imgHeight,top,left} = self.canvasState;
        const pixelSize = width/imgWidth;
        const newMouse = [
            Math.floor((parseInt(mouse[0]) - this.editor.offsetLeft - left)/pixelSize),
            Math.floor((parseInt(mouse[1]) - this.editor.offsetTop  - top )/pixelSize),
            mouse[2]
        ];
        newMouse[0]%=imgWidth ;
        newMouse[1]%=imgHeight;
        const path = opened[activeIndex];
        return [newMouse,path];
    }
    setSize(change, mouse,activeIndex,opened, canvasState,canvas) {
        var {width,height,top,left} = canvasState;
        const newMouse = [
            (mouse[0] - this.editor.offsetLeft - left),
            (mouse[1] - this.editor.offsetTop  - top )
        ];
        const aspect = height/width;
        
        //increase canvas width by "change" and make height match to aspect ratio
        canvasState.width = canvas.width = (width-change);
        canvasState.height = canvas.height = (width-change)*aspect;
        canvas.width *=3;
        canvas.height*=3;

        //move canvas so mouse position will stay static
        left=canvasState.left = left+(change*newMouse[0]/width);
        top =canvasState.top  = top +(change*newMouse[1]/width);
        canvas.setAttribute("style","top:"+top+"px;left:"+left+"px;");
    }
}