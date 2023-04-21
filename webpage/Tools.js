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
    constructor() {
        super();
        document.getElementById("brushSize").value         = this.size;
        document.getElementById("brushTransparency").value = this.transparency*100;
        document.getElementById("brushColor").value      = util.RgbToHex(this.color);
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
                this.saveColor(util.RgbToHex(this.color));
            }
        }
        return [true,pixelsData];
    }
    async saveColor(color) {
        if (this.colorHistory.includes(color)) {
            if (this.colorHistory[0] == color) return;
            delete this.colorHistory[this.colorHistory.indexOf(color)];
            this.colorHistory.unshift(color);
        } else {
            this.colorHistory.unshift(color);
            this.colorHistory.pop();
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
    bucketColorsDiv;
    colorHistory = ["#FFFFFF","#000000","#FF0000","#00FF00","#0000FF"];
    constructor() {
        super();
        document.getElementById("bucketColor").value      = util.RgbToHex(this.color);
        document.getElementById("bucketTransparency").value = this.transparency*100;
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
            if ((Pr!=r||Pg!=g||Pb!=b||Pa!=a) && !(Pa==0&&a==0)) return [false,pixelsData];
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
        currentStroke.push([[x,y],[[r,g,b],a]]);
        this.saveColor(util.RgbToHex(this.color));
        //overlay with different transparencies
        //round to nearest integer
        pixelsData = this.Draw([pos[0]  ,pos[1]+1],properties,currentStroke,[[r,g,b],a])[1];
        pixelsData = this.Draw([pos[0]+1,pos[1]  ],properties,currentStroke,[[r,g,b],a])[1];
        pixelsData = this.Draw([pos[0]  ,pos[1]-1],properties,currentStroke,[[r,g,b],a])[1];
        pixelsData = this.Draw([pos[0]-1,pos[1]  ],properties,currentStroke,[[r,g,b],a])[1];
        return [true,pixelsData];
    }
    async saveColor(color) {
        if (this.colorHistory.includes(color)) {
            if (this.colorHistory[0] == color) return;
            delete this.colorHistory[this.colorHistory.indexOf(color)];
            this.colorHistory.unshift(color);
        } else {
            this.colorHistory.unshift(color);
            this.colorHistory.pop();
        }
        this.bucketColorsDiv.innerHTML = this.colorHistory.map(el=>("<button class='colorButton:' onclick=\"canvas.setOption('brush','color','" + el + "');\" style='--color:"+el+"'></button>")).join("");
    }
}