const { QdrantClient } = require('qdrant-client');
const { TFAutoModel, AutoTokenizer } = require('@huggingface/transformers');
const { Ollama } = require('langchain');
const fs = require('fs');
const path = require('path');
const { LlamaModel, LlamaTokenizer } = require('transformers'); // Assuming a compatible library

const client = new QdrantClient("http://34.101.137.149:6333", {
    apiKey: "YOUR_API_KEY" // If your Qdrant instance requires an API key
});

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
