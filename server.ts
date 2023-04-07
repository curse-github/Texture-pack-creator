const express = require("express");
import fs from "fs";

var app:any = express();
var pages:{[key:string]:any} = {
    "/index.html"     :(req:any,res:any,send:any)=>send("/webpage/index.html" ),
    "/index.css"      :(req:any,res:any,send:any)=>send("/webpage/index.css"  ),
    "/index.js"       :(req:any,res:any,send:any)=>send("/webpage/index.js"   ),
    "/sorts/all.json" :(req:any,res:any,send:any)=>send(                      ),
}
Object.keys(pages).forEach((i) => {
    app.get(i, (req:any, res:any) => {
        pages[i](req, res, ((page:string) => { res.sendFile(__dirname + (page != null ? page : i), "utf8"); }));
    });
});
app.get("/minecraft/*.*", (req:any, res:any) => {
    fs.promises.access(__dirname+req._parsedUrl.pathname, fs.constants.R_OK | fs.constants.W_OK)
    .then(() => {
        res.sendFile(__dirname+req._parsedUrl.pathname);
    })
    .catch(() => console.error('cannot access'));
});
app.get("*", (req:any, res:any) => { res.redirect("/index.html"); });
var server:any = app.listen(80, function () {
    var port:number = server.address().port;
    console.clear();
    console.log("Public web execution page is running at http://localhost:" + port);
});