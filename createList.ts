import fs from "fs";
const imageSize = require('image-size');

var json:data = {};
interface data {
    directories?:{[key:string]:data};
    files?:string[][];
}

async function imageSizePromise(path:string) {
    return new Promise<[number,number]>((resolve)=>{
        imageSize(path, function (err:any, dimensions:{[key:string]:number}) {
            if (err) { console.log(err); return; }
            resolve([dimensions.width,dimensions.height]);
        });
    });
}



async function allSort(dirname:string,name:string) {
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
                    promises.push(allSort(dirname+"/"+data[i].name,data[i].name));
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
                resolve([name,object]);
            }).catch(err=>console.log("err: " + err));
        }).catch((err)=>{
            console.log(err);
        });
    });
}
async function listSort(dirname:string,master:string,layers:number) {
    return new Promise<{[key:string]:any}>(async(resolve)=>{
        async function list(name:string,master:string):Promise<{[key:string]:any}> {
            var object:{[key:string]:any} = {};
            return new Promise<{[key:string]:any}>((resolve)=>{
                var promises:Promise<any>[] = [];
                //read directory
                fs.promises.readdir(name).then(async(data:string[])=>{
                    for (let i:number = 0; i < data.length; i++) {
                        //get stats for each file/directory
                        var stat:fs.Stats = await fs.promises.stat(name+"/"+data[i]);
                        if (stat.isDirectory()) {
                            //if it is a directory run function recursively
                            promises.push(list(name+"/"+data[i],master));
                            delete data[i];
                        }
                    }
                    data = data.filter(el=>(el!=null&&el!=undefined));
                    object.files = [];
                    for(let i = 0; i < data.length; i++) {
                        const element = data[i];
                        const fullPath = (name+"/"+element).replace(__dirname,"");
                        var fileExt:string[]|string = element.split(".");
                        fileExt.shift();
                        fileExt = ((fileExt.length>0)?".":"")+fileExt.join(".");
                        var properties:{[key:string]:string|number} = {};
                        //if image is a png get resolution and put in "properties" object
                        if (fileExt == ".png") {
                            const [width,height] = await imageSizePromise(name+"/"+element);
                            properties["width"] = width;
                            properties["height"] = height;
                        }
                        object.files[i] = {
                            "name":fullPath.replace(master,""),
                            "path":fullPath,
                            "extention":fileExt,
                            "properties":properties
                        };
                    }
                    Promise.all(promises).then((list)=>{
                        //wait for all promises to be finished
                        for(let i = 0; i < list.length; i++) {
                            const files = list[i].files;
                            for(let j = 0; j < files.length; j++) {
                                //put files in existing files list
                                object.files.push(files[j]);
                            }
                        }
                        //sort by name
                        object.files=object.files.sort((a:any,b:any)=>{
                            return (a.name as string).localeCompare((b.name as string), undefined, {numeric: true, sensitivity: 'base'});
                        });
                        //return organized data object
                        resolve(object);
                    }).catch(err=>console.log("err: " + err));
                });
            });
        }
        var object:{[key:string]:any} = {
            directories:{},
            files:[]
        };
        fs.promises.readdir(dirname).then(async(data:string[])=>{
            for (let i:number = 0; i < data.length; i++) {
                //get stats for each file/directory
                var stat:fs.Stats = await fs.promises.stat(dirname+"/"+data[i]);
                if (stat.isDirectory()) {
                    //if it is a directory run function recursively
                    //if it is 3 layers deep collapse the file structure into the name
                    if (layers==3) {
                        const tmpData = (await list(dirname+"/"+data[i],master));
                        for(let i = 0; i < tmpData.files.length; i++) {
                            object.files.push(tmpData.files[i]);
                        }
                    }else {
                        object.directories[data[i]] = (await listSort(dirname+"/"+data[i],master+"/"+data[i],layers+1));
                    }
                    delete data[i];
                }
            }
            data = data.filter(el=>(el!=null&&el!=undefined));
            for(let i = 0; i < data.length; i++) {
                const el=data[i];
                const fullPath = (dirname+"/"+el).replace(__dirname,"");
                var fileExt:string[]|string = el.split(".");
                fileExt.shift();
                fileExt = ((fileExt.length>0)?".":"")+fileExt.join(".");
                var properties:{[key:string]:string|number} = {};
                //if image is a png get resolution and put in "properties" object
                if (fileExt == ".png") {
                    const [width,height] = await imageSizePromise(dirname+"/"+el);
                    properties["width"] = width;
                    properties["height"] = height;
                }
                object.files.push({
                    "name":el,
                    "path":fullPath,
                    "extention":fileExt,
                    "properties":properties
                });
            }
            resolve(object);
        });
    });
}
async function run() {
    console.clear();
    console.log("start");
    json = (await listSort(__dirname+"/minecraft","/minecraft",0)).directories.assets.directories.textures;
    fs.promises.writeFile(__dirname+"/sorts/list.json", JSON.stringify(["textures",json],null,2)).catch(err=>console.log("err2: " + err));
}
run();
