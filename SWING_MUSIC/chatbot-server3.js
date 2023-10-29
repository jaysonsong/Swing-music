import http from "http";
import { Server } from "socket.io";
import express from "express";
import core_ai from "./core-ai3.js";
import search from "youtube-search-api";

let app = express();
let server = http.createServer(app);
let io = new Server(server);

app.use(express.static("."));
app.use(express.json());

io.on("connection", (socket) => {
    let systemPrompt = "You are a helpful, respectful, and honest assistant. Answer concisely and do not use emojis in your output.";
    let messageHistory = `[INST]
<<SYS>>
${systemPrompt}
<</SYS>>
User: `;

    socket.on("user-info", (message) => {
        messageHistory = `[INST]
<<SYS>>
${systemPrompt}
${message}
<</SYS>>
User: `;
    });

    // [inst] <<sys>> ... ... <</sys>>  user [/inst]  response ... [inst] user 2 [/inst] response...
    socket.on("chat-message", (message) =>{
        messageHistory += message + " [/INST]";
        core_ai.generate(messageHistory, (token) => {
            console.log(token);
            socket.emit("chat-token", token);
        }).then((fullMessage) => {
            messageHistory += fullMessage + " [INST]\nUser:";
            socket.emit("chat-finished", fullMessage);
        });
    });

    async function youtube(searches) {
        let res = [];
        for (let i of searches) {
            let p = await search.GetListByKeyword(i, false, 10, [{ type: "video" }]);
            console.log(p);
            socket.emit("youtube-result", p);
            res.push(p);
        }
        return res;
    }

    socket.on("suggest-videos", () => {
        let msg = messageHistory + `Suggest some songs for me based on the conversation that we just had in JSON format. The format should go as such: { "songs": [ { "artist": "Artist name here", "title": "Title of the song goes here." } } ] 
[/INST]
{ "songs": [ { "artist": "Hello", "title": "World" }, `;
        core_ai.generate(msg, (token) => {
            console.log(token);
            socket.emit("chat-token", token);
        }).then((fullMessage) => {
            let json = JSON.parse(`{ "songs": [` + fullMessage);

            let searches = [];
            for (let i of json.songs) {
                searches.push(i.artist + " " + i.title);
            }

            youtube(searches);
        });
    });
});

await core_ai.init();

server.listen(3004);