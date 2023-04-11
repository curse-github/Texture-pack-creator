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

    json = (await allSort(__dirname+"/minecraft","/minecraft",true));
    fs.promises.writeFile(__dirname+"/sorts/all.json", JSON.stringify(json,null,2)).catch(err=>console.log("err2: " + err));

    const endTime = (new Date().getTime());
    console.log("end  : "+endTime+" ms");
    const totalTime = endTime-startTime;
    console.log("");
    console.log("total: "+totalTime.toString().padEnd(7," ")+"milli-seconds");
    console.log("or     "+(totalTime/1000).toString().padEnd(7," ")+"seconds");
}
run();
