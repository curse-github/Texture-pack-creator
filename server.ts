const express = require("express");
import fs from "fs";

var app:any = express();
//by file
Object.entries({
    "/index.html"      :(req:any,res:any,send:any)=>send("/webpage/index.html" ),
    "/index.css"       :(req:any,res:any,send:any)=>send("/webpage/index.css"  ),
    "/index.js"        :(req:any,res:any,send:any)=>send("/webpage/index.js"   ),
    "/myCanvas.js"     :(req:any,res:any,send:any)=>send("/webpage/myCanvas.js"),
    "/MonocraftBetterBrackets.ttf" :(req:any,res:any,send:any)=>send(          ),
    "/jszip.js"        :(req:any,res:any,send:any)=>send("/js/jszip.js"        ),
    "/FileSaver.js"    :(req:any,res:any,send:any)=>send("/js/FileSaver.js"    ),
}).forEach((entry) => {
    app.get(entry[0], (req:any, res:any) => {
        entry[1](req, res, ((page:string) => { res.sendFile(__dirname + (page != null ? page : entry[0]), "utf8"); }));
    });
});
//by folder
[
    "/minecraft/*.*",
    "/sorts/*.json"
].forEach((folder)=>{
    app.get(folder, (req:any, res:any) => {
        //if file exists send it
        fs.promises.access(__dirname+req._parsedUrl.pathname, fs.constants.R_OK)
        .then(() => {
            res.sendFile(__dirname+req._parsedUrl.pathname);
        })
        .catch(() => console.error('cannot access'));
    });
});
//everything else goes to index.html
app.get("*", (req:any, res:any) => { res.redirect("/index.html"); });
var server:any = app.listen(80, function () {
    var port:number = server.address().port;
    console.clear();
    console.log("Public web execution page is running at http://localhost:" + port);
});