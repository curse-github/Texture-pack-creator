import fs from "fs";
const imageSize = require('image-size');

var json:data = {};
interface data {
    directories?:{[key:string]:data};
    files?:string[][];
}
async function readdir(dirname:string,name:string) {
    var object:data = {};
    return new Promise<any>((resolve)=>{
        fs.promises.readdir(dirname)
        .then(async(data:any)=>{
            data = data.map((el:any)=>{
                const fullPath = dirname.replace(__dirname,"")+"/"+el;
                var fileExt = el.split(".");
                const fileName = fileExt.shift();
                fileExt = ((fileExt.length>0)?".":"")+fileExt.join(".");
                
                var properties:{[key:string]:string|number} = {};
                if (fileExt == ".png") {
                    imageSize(__dirname+fullPath, function (err:any, dimensions:{[key:string]:number}) {
                        if (err) { console.log(err); return; }
                        properties["width"] = dimensions.width;
                        properties["height"] = dimensions.height;
                    });
                }
                const output = {
                    "name":fileName,
                    "path":fullPath,
                    "extention":fileExt,
                    "properties":properties
                }
                //{name,path,extention,properties}
                return output;
            });
            var promises:Promise<any>[] = []
            for (let i:number = 0; i < data.length; i++) {
                var stat:fs.Stats = await fs.promises.stat(dirname+"/"+data[i].name+data[i].extention);
                if (stat.isDirectory()) {
                    promises.push(readdir(dirname+"/"+data[i].name,data[i].name));
                    delete data[i];
                }
            }
            data = data.filter((el:any)=>el!=null);
            if (data.length>0) object.files = data;
            Promise.all(promises).then((list)=>{
                for(let i = 0; i < list.length; i++) {
                    object.directories = object.directories||{};
                    object.directories[list[i][0]] = list[i][1];
                }
                resolve([name,object]);
            }).catch(err=>console.log("err: " + err));
        }).catch((err)=>{
            console.log(err);
        });
    });
}

async function run() { json = (await readdir(__dirname+"/minecraft",""))[1]; fs.promises.writeFile(__dirname+"/sorts/all.json", JSON.stringify(json,null,2)).catch(err=>console.log("err2: " + err)); }
run();
