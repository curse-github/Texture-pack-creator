import fs from "fs";

var json:data = {};
interface data {
    directories?:{[key:string]:data};
    files?:string[][];
}
async function readdir(dirname:string,name:string) {
    var object:data = {};
    return new Promise<any>((resolve)=>{
        fs.promises.readdir(dirname)
        .then(async(data:string[]|string[][])=>{
            data = data.map((el:any)=>([el,dirname.replace(__dirname,"")+"/"+el]));
            var promises:Promise<any>[] = []
            for (let i:number = 0; i < data.length; i++) {
                var stat:fs.Stats = await fs.promises.stat(dirname+"/"+data[i][0]);
                if (stat.isDirectory()) {
                    promises.push(readdir(dirname+"/"+data[i][0],data[i][0]));
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
