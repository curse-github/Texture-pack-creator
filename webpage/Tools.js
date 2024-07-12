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
    brushColorsDiv;
    colorHistory = ["#FFFFFF","#000000","#FF0000","#00FF00","#0000FF"];
    colorMode = "color";
    constructor() {
        super();
        document.getElementById("brushSize").value         = this.size;
        document.getElementById("brushTransparency").value = this.transparency*100;
        document.getElementById("brushColor").value      = util.RgbToHex(this.color);
        document.getElementById("brushMode").value = this.colorMode;
        this.brushColorsDiv = document.querySelector("div#toolSettings > div#brush div#colorHistory > div#hoverCont");
        this.brushColorsDiv.innerHTML = this.colorHistory.map(el=>("<button class='colorButton:' onclick=\"canvas.setOption('brush','color','" + el + "');\" style='--color:"+el+"'></button>")).join("");
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
            },
            "mode":(value)=>{
                this.colorMode = document.getElementById("brushMode").value = value;
            }
        };
        (mySwitch[option]||(()=>{}))(value);
    }
    Draw(pos,properties,currentStroke,canvasState) {
        const pixelsData = properties.imgData;

        const [bR,bG,bB] = this.color;
        const [bH,bS,bV] = util.rgb2hsv(this.color);
        const bA = this.transparency;
        if (bA <= 0) [false,pixelsData];

        const subtract = Math.floor(this.size/2-0.49);//amount to move left from mouse pos
        const add = this.size-subtract;//amount to move right
        for (let x = pos[0]-subtract; x < pos[0]+add; x++) {
            var newX = x; if (canvasState.view=="tile") newX=(newX+properties.width)%properties.width;
            if (newX < 0 || newX >= properties.width) continue;
            for (let y = pos[1]-subtract; y < pos[1]+add; y++) {
                var newY = y; if (canvasState.view=="tile") newY=(newY+properties.height)%properties.height;
                if (newY < 0 || newY >= properties.height) continue;
                //make sure you dont draw the same spot over and over again
                if (currentStroke.filter(el=>(el[0][0]==x&&el[0][1]==y)).length > 0) continue;

                //get current pixel
                const [[r,g,b],a] = pixelsData[newX][newY];
                if (this.colorMode == "color") {
                    //overlay with different transparencies
                    //round to nearest integer
                    pixelsData[newX][newY] = [
                        [Math.round((r*a*(1-bA)+bR*bA)),
                        Math.round( (g*a*(1-bA)+bG*bA)),
                        Math.round( (b*a*(1-bA)+bB*bA))],
                        Math.round( (a  *(1-bA)+bA   )*255)/255
                    ];
                } else if (this.colorMode == "hue") {
                    const [h,s,v] = util.rgb2hsv([r,g,b]);
                    pixelsData[newX][newY] = [util.hsv2rgb([bH,s,v]),a]
                } else if (this.colorMode == "saturation") {
                    const [h,s,v] = util.rgb2hsv([r,g,b]);
                    pixelsData[newX][newY] = [util.hsv2rgb([h,bS,v]),a]
                } else if (this.colorMode == "value") {
                    const [h,s,v] = util.rgb2hsv([r,g,b]);
                    pixelsData[newX][newY] = [util.hsv2rgb([h,s,bV]),a]
                }
                currentStroke.push([[newX,newY],[[r,g,b],a]]);
                this.saveColor(util.RgbToHex(this.color));
            }
        }
        return [true,pixelsData];
    }
    async saveColor(color) {
        if (this.colorHistory.includes(color)) {
            if (this.colorHistory[0] == color) return;
            delete this.colorHistory[this.colorHistory.indexOf(color)];
            this.colorHistory = this.colorHistory.filter((__,i)=>i<4);
            this.colorHistory.unshift(color);
        } else {
            this.colorHistory.unshift(color);
            this.colorHistory = this.colorHistory.filter((__,i)=>i<5);
        }
        this.brushColorsDiv.innerHTML = this.colorHistory.map(el=>("<button class='colorButton:' onclick=\"canvas.setOption('brush','color','" + el + "');\" style='--color:"+el+"'></button>")).join("");
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
                value = document.getElementById("eraserSize").value = Math.max(1,Number.parseInt(value));
                this.size = value;
            },
            "hardness":(value)=>{
                value = document.getElementById("eraserHardness").value = Math.max(0,Math.min(100,Number.parseInt(value)));
                this.hardness = value/100;
            }
        };
        (mySwitch[option]||(()=>{}))(value);
    }
    Draw(pos,properties,currentStroke,canvasState) {
        var pixelsData = properties.imgData;
        const subtract = Math.floor(this.size/2-0.49);//amount to move left from mouse pos
        const add = this.size - subtract;//amount to move right

        for (let x = Math.min(pos[0]-subtract); x < pos[0]+add; x++) {
            var newX = x; if (canvasState.view=="tile") newX=(newX+properties.width)%properties.width;
            if (newX < 0 || newX >= properties.width) continue;
            for (let y = pos[1]-subtract; y < pos[1]+add; y++) {
                var newY = y; if (canvasState.view=="tile") newY=(newY+properties.height)%properties.height;
                if (newY < 0 || newY >= properties.height) continue;
                //make sure you dont erase the same spot over and over again
                if (currentStroke.filter(el=>(el[0][0]==newX&&el[0][1]==newY)).length > 0) continue;
                const [color,alpha] = pixelsData[newX][newY];
                pixelsData[newX][newY][1] = Math.round(alpha*(1-this.hardness)*255)/255;
                currentStroke.push([[newX,newY],[color,alpha]]);
            }
        }
        return [true,pixelsData];
    }
}
class Bucket extends Tool {
    color = myCanvas.defaultColor;
    transparency = 1;
    bucketColorsDiv;
    colorHistory = ["#FFFFFF","#000000","#FF0000","#00FF00","#0000FF"];
    colorMode = "color";
    constructor() {
        super();
        document.getElementById("bucketColor").value      = util.RgbToHex(this.color);
        document.getElementById("bucketTransparency").value = this.transparency*100;
        document.getElementById("bucketMode").value = this.colorMode;
        this.bucketColorsDiv = document.querySelector("div#toolSettings > div#bucket div#colorHistory > div#hoverCont");
        this.bucketColorsDiv.innerHTML = this.colorHistory.map(el=>("<button class='colorButton:' onclick=\"canvas.setOption('bucket','color','" + el + "');\" style='--color:"+el+"'></button>")).join("");
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
            },
            "mode":(value)=>{
                this.colorMode = document.getElementById("bucketMode").value = value;
            }
        };
        (mySwitch[option]||(()=>{}))(value);
    }
    async Draw(pos,properties,currentStroke,canvasState,parentPixel) {
        return new Promise(async(resolve)=>{
            var pixelsData = properties.imgData;
            const [x,y] = pos;
            var newX = x;
            var newY = y;
            if (canvasState.view=="tile") {
                newX=(newX+properties.width *2)%properties.width ;
                newY=(newY+properties.height*2)%properties.height;
            }
            if (newX < 0 || newX >= properties.width) { resolve([false,pixelsData]); return; }
            if (newY < 0 || newY >= properties.height) { resolve([false,pixelsData]); return; }
            //make sure you dont draw the same spot over and over again
            if (currentStroke.filter(el=>(el[0][0]==newX&&el[0][1]==newY)).length > 0) { resolve([false,pixelsData]); return; }
            //get bucket settings
    
            const [[r,g,b],a] = pixelsData[newX][newY];
            if (parentPixel) {
                const [[Pr,Pg,Pb],Pa] = parentPixel;
                if ((Pr!=r||Pg!=g||Pb!=b||Pa!=a) && !(Pa==0&&a==0)) { resolve([false,pixelsData]); return; }
            }
            const [bR,bG,bB] = this.color;
            if (r==bR&&g==bG&&b==bB&&a==bA) { resolve([true,pixelsData]); return; }//just return if bucket color and pixel color are the same
            
            if (this.colorMode == "color") {
                const bA = this.transparency;
                //overlay with different transparencies
                //round to nearest integer
                pixelsData[newX][newY] = [
                    [Math.round((r*a*(1-bA)+bR*bA)),
                    Math.round( (g*a*(1-bA)+bG*bA)),
                    Math.round( (b*a*(1-bA)+bB*bA))],
                    Math.round( (a  *(1-bA)+bA   )*255)/255
                ];
            } else if (this.colorMode == "hue") {
                const [_,s,v] = util.rgb2hsv([r,g,b]);
                const bH = util.rgb2h(this.color);
                pixelsData[newX][newY] = [util.hsv2rgb([bH,s,v]),a]
            } else if (this.colorMode == "saturation") {
                const [h,_,v] = util.rgb2hsv([r,g,b]);
                const bS = util.rgb2s(this.color);
                pixelsData[newX][newY] = [util.hsv2rgb([h,bS,v]),a]
            } else if (this.colorMode == "value") {
                const [h,s] = util.rgb2hsv([r,g,b]);
                const bV = util.rgb2v(this.color);
                pixelsData[newX][newY] = [util.hsv2rgb([h,s,bV]),a]
            } else { return; }
            currentStroke.push([[newX,newY],[[r,g,b],a]]);
            this.saveColor(util.RgbToHex(this.color));

            await this.Draw([pos[0]  ,pos[1]+1],properties,currentStroke,canvasState,[[r,g,b],a])[1];
            await this.Draw([pos[0]+1,pos[1]  ],properties,currentStroke,canvasState,[[r,g,b],a])[1];
            await this.Draw([pos[0]  ,pos[1]-1],properties,currentStroke,canvasState,[[r,g,b],a])[1];
            await this.Draw([pos[0]-1,pos[1]  ],properties,currentStroke,canvasState,[[r,g,b],a])[1];
            resolve([true,pixelsData]);
        });
    }
    async saveColor(color) {
        if (this.colorHistory.includes(color)) {
            if (this.colorHistory[0] == color) return;
            delete this.colorHistory[this.colorHistory.indexOf(color)];
            this.colorHistory = this.colorHistory.filter((__,i)=>i<4);
            this.colorHistory.unshift(color);
        } else {
            this.colorHistory.unshift(color);
            this.colorHistory = this.colorHistory.filter((__,i)=>i<5);
        }
        this.bucketColorsDiv.innerHTML = this.colorHistory.map(el=>("<button class='colorButton:' onclick=\"canvas.setOption('bucket','color','" + el + "');\" style='--color:"+el+"'></button>")).join("");
    }
}