import fs from "fs";
const imageSize = require('image-size');


interface data {
    directories?:{[key:string]:data};
    files?:{[key:string]:(string|{[key:string]:(string|string[])})}[];
}

async function imageSizePromise(path:string) {
    return new Promise<[number,number]>((resolve)=>{
        imageSize(path, function (err:any, dimensions:{[key:string]:number}) {
            if (err) { console.log(err); return; }
            resolve([dimensions.width,dimensions.height]);
        });
    });
}

async function allSort(dirname:string,name:string,final:boolean) {
    var object:data = {};
    return new Promise<any>((resolve)=>{
        fs.promises.readdir(dirname)
        .then(async(data:any)=>{
            data = data.map((el:any)=>{
                const fullPath = dirname.replace(__dirname,"")+"/"+el;
                var fileExt = el.split(".");
                fileExt.shift();
                fileExt = ((fileExt.length>0)?".":"")+fileExt.join(".");
                
                var properties:{[key:string]:string|number} = {};
                //if image is a png get resolution and put in "properties" object
                if (fileExt == ".png") {
                    imageSize(__dirname+fullPath, function (err:any, dimensions:{[key:string]:number}) {
                        if (err) { console.log(err); return; }
                        properties["width"] = dimensions.width;
                        properties["height"] = dimensions.height;
                    });
                }
                const output = {
                    "name":el,
                    "path":fullPath,
                    "extention":fileExt,
                    "properties":properties
                }
                //{name,path,extention,properties}
                return output;
            }).sort((a:any,b:any)=>{
                //sort by name
                return (a.name as string).localeCompare((b.name as string), undefined, {numeric: true, sensitivity: 'base'});
            });
            //for each directory run this function recursively again
            var promises:Promise<any>[] = []
            for (let i:number = 0; i < data.length; i++) {
                var stat:fs.Stats = await fs.promises.stat(dirname+"/"+data[i].name);
                if (stat.isDirectory()) {
                    //add to promises list
                    promises.push(allSort(dirname+"/"+data[i].name,data[i].name,false));
                    delete data[i];
                }
            }
            data = data.filter((el:any)=>el!=null);
            //set files of directory to whats left of the data list
            if (data.length>0) object.files = data;
            Promise.all(promises).then((list)=>{
                //wait for all promises to be finished
                for(let i = 0; i < list.length; i++) {
                    //set directories of object
                    object.directories = object.directories||{};
                    object.directories[list[i][0]] = list[i][1];
                }
                //return folder name and organized data object
                if (final) resolve(object);
                else resolve([name,object]);
                
            }).catch(err=>console.log("err: " + err));
        }).catch((err)=>{
            console.log(err);
        });
    });
}
async function run() {
    console.clear();
    const startTime = (new Date().getTime());
    console.log("start: "+startTime+" ms");

    //add all files to object
    var json:data = (await allSort(__dirname+"/minecraft","/minecraft",true));

    const tags:{[key:string]:{[key:string]:string[]}} = JSON.parse(""+(await fs.promises.readFile(__dirname+"/data/tags.json")));
    const blocks:{[key:string]:string[]} = JSON.parse(""+(await fs.promises.readFile(__dirname+"/data/blocks.json")));
    
    //add tags
    var tmp = json.directories!.assets.directories!.minecraft.directories!.textures.directories!;
    //item tags
    var itemFiles:{[key:string]:(string|{[key:string]:(string|string[])})}[] = tmp.item.files!
    for (let i = 0; i < itemFiles.length; i++) {
        const file = itemFiles[i];
        if (!((file.name as string).endsWith(".png"))) continue;
        const name = (file.name as string).split(".")[0];
        const itemTags:string[] = tags.items[name];
        if (itemTags) (itemFiles[i].properties as {[key:string]:string[]}).tags = itemTags;
    }
    tmp.item.files = itemFiles;
    //block tags
    var blockFiles:{[key:string]:(string|{[key:string]:(string|string[])})}[] = tmp.block.files!
    for (let i = 0; i < blockFiles.length; i++) {
        const file = blockFiles[i];
        if (!((file.name as string).endsWith(".png"))) continue;
        const name = (file.name as string).split(".")[0];
        if (blocks[name]) {
            (blockFiles[i].properties as {[key:string]:string[]}).blocks = blocks[name];
            var blockTags:string[] = [];
            for (let j = 0; j < blocks[name].length; j++) {
                if(tags.blocks[blocks[name][j]]) tags.blocks[blocks[name][j]].forEach(el=>{if (!blockTags.includes(el)) { blockTags.push(el); }});
            }
            if (blockTags.length>0) (blockFiles[i].properties as {[key:string]:(string|string[])}).tags = blockTags;
        }// else {console.log(name)}
    }
    tmp.block.files = blockFiles;
    json.directories!.assets.directories!.minecraft.directories!.textures.directories! = tmp;
    fs.promises.writeFile(__dirname+"/sorts/all.json", JSON.stringify(json,null,2)).catch(err=>console.log("err2: " + err));

    const endTime = (new Date().getTime());
    console.log("end  : "+endTime+" ms");
    const totalTime = endTime-startTime;
    console.log("");
    console.log("total: "+totalTime.toString().padEnd(7," ")+"milli-seconds");
    console.log("or     "+(totalTime/1000).toString().padEnd(7," ")+"seconds");
}
run();
