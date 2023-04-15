import * as fs from "fs";

async function readTags(folder:string) {
    var tags:{[key:string]:string[]} = {};
    return new Promise<{[key:string]:string[]}>((resolve)=>{
        var promises:Promise<{[key:string]:string[]}>[] = [];
        fs.promises.readdir(folder)
        .then(async(files:string[])=>{
            for (let i = 0; i < files.length; i++) {
                var fileName = files[i];
                const fullPath = folder+"/"+fileName;
                fileName = fileName.split(".")[0];
                var stat:fs.Stats = await fs.promises.stat(fullPath);
                if (stat.isDirectory()) {
                    //add to promises list
                    promises.push(readTags(fullPath));
                } else {
                    const result:Buffer = await fs.promises.readFile(fullPath)
                    var json = JSON.parse(""+result);
                    json.values = json.values.filter((el:string)=>el!=null);
                    tags[fileName]=tags[fileName]||[];
                    for (let i = 0; i < json.values.length; i++) {
                        const el = json.values[i];
                        tags[fileName].push(el.replace("minecraft:",""));
                    }
                }
            }
            Promise.all(promises).then((list:{[key:string]:string[]}[])=>{
                //wait for all promises to be finished
                for(let i = 0; i < list.length; i++) {
                    Object.entries(list[i]).forEach(([key,values])=>{
                        tags[key] = tags[key]||[];
                        values = values.filter((el:string)=>el!=null);
                        values.forEach((el:string)=>tags[key].push(el));
                    })
                }
                //return folder name and organized data object
                resolve(tags);
            }).catch(err=>console.log("err: " + err));
        }).catch(console.log);
    });
}
function fixNesting(tags:{[key:string]:string[]}):{[key:string]:string[]} {
    var entr = Object.entries(tags);
    for (let i = 0; i < entr.length; i++) {
        var values = entr[i][1];
        //filter null values
        values = values.filter((el)=>el != null);
        //get just recursive links to other tags
        let links = values.filter((el:string)=>el.startsWith("#"));
        ///return if there arent any
        if (links.length <= 0) continue;
        //remove links
        values = values.filter((el)=>!el.startsWith("#"));
        //push all values from in the link to origional tag
        for (let i = 0; i < links.length; i++) {
            var link = tags[links[i].replace("#","")];
            if (link) link.forEach(el=>values.push(el));
        }
        entr[i][1] = values;
    }
    var hasMoreLinks = false;
    for (let i = 0; i < entr.length; i++) {
        var [key,values] = entr[i];
        let links = values.filter((el:string)=>{return (el != null && el.startsWith("#"))});
        if (links.length > 0) { hasMoreLinks=true; break;}
    };
    tags = Object.fromEntries(entr);
    if (hasMoreLinks) {console.log("has more links"); return fixNesting(tags);}
    else return tags
}
function invert(tags:{[key:string]:string[]}):{[key:string]:string[]} {
    var invert:{[key:string]:string[]} = {};
    var entr = Object.entries(tags);
    for (let i = 0; i < entr.length; i++) {
        var [key,values] = entr[i];
        for (let j = 0; j < values.length; j++) {
            invert[values[j]] = invert[values[j]]||[];
            invert[values[j]].push(key);
        }
    }
    return invert;
}
async function run() {
    console.clear();
    const startTime = (new Date().getTime());

    const json:any = {
        "blocks":fixNesting(await readTags(__dirname+"/tags/blocks")),
        "items":fixNesting(await readTags(__dirname+"/tags/items"))
    };
    if (!json) {console.log("json is null"); return;}
    //fs.promises.writeFile(__dirname+"/data/tags.json", JSON.stringify(json,null,2)).catch(err=>console.log("err2: " + err));
    const inverted = {
        "blocks":invert(json.blocks),
        "items":invert(json.items)
    }
    //fs.promises.writeFile(__dirname+"/data/tagsInverted.json", JSON.stringify(inverted,null,2)).catch(err=>console.log("err2: " + err));
    
    fs.promises.writeFile(__dirname+"/data/tags.json", JSON.stringify(inverted,null,2)).catch(err=>console.log("err2: " + err));
    const endTime = (new Date().getTime());
    const totalTime = endTime-startTime;
    console.log("\nstart: "+startTime+" ms");
    console.log("end  : "+endTime+" ms");
    console.log("");
    console.log("total: "+totalTime.toString().padEnd(7," ")+"milli-seconds");
    console.log("or     "+(totalTime/1000).toString().padEnd(7," ")+"seconds");
}
run();
