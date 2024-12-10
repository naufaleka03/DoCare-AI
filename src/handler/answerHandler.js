const { QdrantClient } = require('@qdrant/js-client-rest');
const { AutoTokenizer, AutoModel } = require('@huggingface/transformers');
const ollama = require('ollama');
require('dotenv').config(); 

const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.QDRANT_API_KEY
    }
});

let tokenizer;

// Create an async function to initialize the tokenizer
const initializeTokenizer = async () => {
    tokenizer = await AutoTokenizer.from_pretrained('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2');
};

// Call the initialization function
initializeTokenizer();

async function generate(context, query, tone = "professional and friendly") {
    console.log('Context being used:', context); // Log the context being used
    
    const contextText = context.join(' ');
    const inputText = `
    You are a healthcare chatbot. Please answer the question in a tone ${tone}.
    Give all the answers related to the question disease. If there is no answer related to the disease, don't say "no information", but say "this is the only information I got". Do not make up an answer.
    If the answer is not available, don't answer, do not make up an answer.
    Here are some rules on how to answer :
    - Use language that is ${tone}
    - Before answering say "Thank you for consulting with DoCare AI"
    - At the end of the answer say "Hope this information helps and wish you a speedy recovery and say thank you"
    - Answer questions based on the language of the question given.
    The following is informational text to answer questions later:
    
    ${contextText}
    
    After you read the informational text, answer the following questions clearly according to the question.
    Question: ${query}
    `;

    try {
        // Create a request to the Ollama API
        const response = await fetch('process.env.OLLAMA_API_URL', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama3.1',
                prompt: inputText,
                stream: false
            })
        });

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error("Error during generation:", error);
        throw error;
    }
}

async function generateEmbeddings(query) {
    try {
        // Tokenize the input
        const encoded = await tokenizer(query, {
            padding: true,
            truncation: true,
            return_tensors: "tf"
        });

        // Convert to embeddings using the model
        const model = await AutoModel.from_pretrained('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2');
        const embeddings = await model(encoded);
        
        return embeddings;
    } catch (error) {
        console.error("Error generating embeddings:", error);
        throw error;
    }
}

async function search(query) {
    try {
        console.log('Starting search for query:', query);
        
        // Perform search in Qdrant
        const results = await client.search('Healthcare', {
            vector: Array(384).fill(0), // This is the issue! We're using dummy vectors
            limit: 3
        });
        
        // Add detailed logging
        console.log('Search scores:', results.map(r => ({
            score: r.score,
            question: r.payload.question
        })));

        if (!results || results.length === 0) {
            console.warn('No results returned from Qdrant.');
            return [];
        }

        return results.map(res => `${res.payload.question} ${res.payload.answer}`);
    } catch (error) {
        console.error("Search Error:", error);
        throw error;
    }
}

async function handleResponse(response) {
    let output = '';
    for await (const chunk of response) {
        output += chunk.message.content;
    }
    return output;
}

async function testQdrantConnection() {
    try {
        // First try a direct HTTP request to verify connectivity
        const response = await fetch(`${process.env.QDRANT_URL}collections`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Direct HTTP test successful:', data);
        
        // Then try the client
        const collections = await client.getCollections();
        console.log('Available Collections:', collections);
        
        return true;
    } catch (error) {
        console.error('Failed to connect to Qdrant:', error.message);
        if (error.cause) {
            console.error('Cause:', error.cause);
        }
        return false;
    }
}

// Add this to your initialization code
testQdrantConnection()
    .then(isConnected => {
        if (isConnected) {
            console.log('Successfully connected to Qdrant');
        } else {
            console.log('Failed to connect to Qdrant');
        }
    });

module.exports = { generate, search };