const { QdrantClient } = require('qdrant-client');
const { TFAutoModel, AutoTokenizer } = require('@huggingface/transformers');
const { Ollama } = require('langchain');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');
const { LlamaModel, LlamaTokenizer } = require('transformers'); // Assuming a compatible library

const client = new QdrantClient("https://c56346fe-194b-4166-a930-915844d54af5.us-east-1-0.aws.cloud.qdrant.io:6333/", {
    apiKey: "RKlzScQJy5oMtooCItO2w79nVpSbH54QE92te8uZof-JfWf_sxfYxA"
});

const storage = new Storage();
const bucketName = 'your-bucket-name'; // Replace with your bucket name
const modelFolder = 'path/to/your/model/folder'; // Replace with your model folder path

async function downloadModelFiles() {
    const modelFiles = ['checklist.chk', 'consolidated.00.pth', 'params.json', 'tokenizer.model'];
    const localModelPath = path.join(__dirname, 'llama_model'); // Local path to store the model

    // Create local directory if it doesn't exist
    if (!fs.existsSync(localModelPath)) {
        fs.mkdirSync(localModelPath);
    }

    // Download each file from GCS
    for (const file of modelFiles) {
        const filePath = path.join(localModelPath, file);
        const options = {
            destination: filePath,
        };

        await storage.bucket(bucketName).file(path.join(modelFolder, file)).download(options);
        console.log(`Downloaded ${file} to ${filePath}`);
    }

    return localModelPath;
}

async function loadModel() {
    const localModelPath = await downloadModelFiles();
    
    // Load the tokenizer and model from the local path
    const tokenizer = await LlamaTokenizer.from_pretrained(localModelPath);
    const model = await LlamaModel.from_pretrained(localModelPath);

    return { tokenizer, model };
}

const modelId = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';
const tokenizer = AutoTokenizer.fromPretrained(modelId);
const model = TFAutoModel.fromPretrained(modelId);
const llama = new Ollama({ model: "llama3.1" });

async function generate(context, query, tone = "professional and friendly") {
    const contextText = context.join(' ');
    // Implement the LLMChain logic here
    const response = await llama.call({ context: contextText, query, tone });
    return response;
}

async function search(query) {
    const queryVector = tokenizer.encode(query, { padding: true, truncation: true });
    const results = await client.search({
        collection_name: 'Healthcare',
        query_vector: queryVector,
        limit: 3
    });

    const sortedResult = results.sort((a, b) => b.score - a.score);
    return sortedResult.map(res => `${res.payload.question} ${res.payload.answer}`);
}

module.exports = { generate, search };
