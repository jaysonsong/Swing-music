import { LLM } from "llama-node";
import { LLamaCpp } from "llama-node/dist/llm/llama-cpp.cjs";

const llama = new LLM(LLamaCpp);
const config = {
    modelPath: "llama-2-7b-chat.ggmlv3.q4_0.bin",
    enableLogging: true,
    nCtx: 1024,
    seed: 0,
    f16Kv: false,
    logitsAll: false,
    vocabOnly: false,
    useMlock: false,
    embedding: false,
    useMmap: true,
    nGpuLayers: 0
};

async function init() {
    await llama.load(config);
}
async function generate(prompt, callback) {
    let text = "";
    try {
        let abort = new AbortController();
        function stop() {
            abort.abort();
        }
        await llama.createCompletion({
            nThreads: 4,
            nTokPredict: 2048,
            topK: 40,
            topP: 0.1,
            temp: 0.2,
            repeatPenalty: 1,
            prompt,
        }, (word) => {
            if (!word.completed) {
                callback(word.token);
                text += word.token;
            }
        }, abort.signal);
    } catch (e) {
        if (e && e.constructor && e.constructor.name === "LLMError") {

        } else
            throw e;
    }
    return text;
}

export default { init, generate };