import { objects } from "discord-emoji";
import * as fs from "fs";

async function readStates() {
    var blocks:{[key:string]:string[]} = {};
    var models:{[key:string]:string[]} = {};
    return new Promise<{[key:string]:string[]}>((resolve)=>{
        var promises:Promise<{[key:string]:string[]}>[] = [];
        fs.promises.readdir(__dirname+"/minecraft/assets/minecraft/blockstates")
        .then(async(files:string[])=>{
            for (let i = 0; i < files.length; i++) {
                var fileName = files[i];
                const fullPath = __dirname+"/minecraft/assets/minecraft/blockstates/"+fileName;
                fileName = fileName.split(".")[0];
                if (fileName=="air"||fileName=="cave_air"||fileName=="void_air") continue;
                blocks[fileName] = [];
                models[fileName] = [];
                
                const contents:string = ""+await fs.promises.readFile(fullPath);
                const result:any = JSON.parse(contents);
                if (result.multipart) {
                    result.variants = {};
                    for (let j = 0; j < result.multipart.length; j++) {
                        const part = result.multipart[j];
                        if (part.apply) result.variants[j] = part.apply;
                    }
                    delete result.multipart;
                }
                const variants:any = Object.entries(result.variants);
                for (let j = 0; j < variants.length; j++) {
                    const [key,variant] = variants[j];
                    if(Array.isArray(variant)) {
                        for (let k = 0; k < variant.length; k++) {
                            if (models[fileName].includes(variant[k].model)) continue;
                            models[fileName].push(variant[k].model);
                            const textures = await readModel(variant[k].model);
                            for (let l = 0; l < textures.length; l++) {
                                textures[l] = textures[l].replace("minecraft:","");
                                textures[l] = textures[l].replace("block/","");
                                if (blocks[fileName].includes(textures[l])) continue;
                                blocks[fileName].push(textures[l])
                            }
                        }
                    }
                    else {
                        if (models[fileName].includes(variant.model)) continue;
                        models[fileName].push(variant.model);
                        const textures = await readModel(variant.model);
                        for (let k = 0; k < textures.length; k++) {
                            textures[k] = textures[k].replace("minecraft:","");
                            textures[k] = textures[k].replace("block/","");
                            if (blocks[fileName].includes(textures[k])) continue;
                            blocks[fileName].push(textures[k])
                        }
                    }
                }
            }
            resolve(blocks)
        }).catch(console.log);
    });
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
async function readModel(modelName:string) {return new Promise<any>(async(resolve)=>{
    modelName = modelName.replace("minecraft:","");
    modelName = modelName.replace("block/","");
    const fullPath = __dirname+"/minecraft/assets/minecraft/models/block/"+modelName+".json";
    const contents:string = ""+await fs.promises.readFile(fullPath);
    var model:any = JSON.parse(contents);
    var textures:string[] = []
    if (model.textures) textures = Object.values(model.textures);
    if (model.parent) {
        const parentTextures = await readModel(model.parent);
        for (let i = 0; i < parentTextures.length; i++) {
            parentTextures[i] = parentTextures[i].replace("minecraft:","");
            parentTextures[i] = parentTextures[i].replace("block/","");
            if (textures.includes(parentTextures[i]) || parentTextures[i].startsWith("#")) continue;
            textures.push(parentTextures[i])
        }
    }
    resolve(textures);
});}
async function run() {
    console.clear();
    const startTime = (new Date().getTime());

    const json:any = invert(await readStates());
    fs.promises.writeFile(__dirname+"/data/blocks.json", JSON.stringify(json,null,2)).catch(err=>console.log("err2: " + err));

    const endTime = (new Date().getTime());
    const totalTime = endTime-startTime;
    console.log("\nstart: "+startTime+" ms");
    console.log("end  : "+endTime+" ms");
    console.log("");
    console.log("total: "+totalTime.toString().padEnd(7," ")+"milli-seconds");
    console.log("or     "+(totalTime/1000).toString().padEnd(7," ")+"seconds");
}
run();
