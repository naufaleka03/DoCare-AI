const { QdrantClient } = require('@qdrant/js-client-rest');
const { AutoTokenizer, AutoModel } = require('@huggingface/transformers');
const { Ollama } = require('ollama');
const os = require('os');
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

let model;
let tokenizer;

function logSystemResources() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpuUsage = os.loadavg()[0];
    
    console.log('\nSystem Resources:');
    console.log(`Memory Usage: ${Math.round(usedMem/1024/1024)}MB / ${Math.round(totalMem/1024/1024)}MB`);
    console.log(`CPU Load (1m avg): ${cpuUsage}`);
    
    // Add GPU monitoring if possible
    try {
        const { exec } = require('child_process');
        exec('nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader,nounits', (error, stdout) => {
            if (!error) {
                const [gpuUtil, gpuMem] = stdout.trim().split(',').map(Number);
                console.log(`GPU Utilization: ${gpuUtil}%`);
                console.log(`GPU Memory Used: ${gpuMem}MB`);
            }
        });
    } catch (error) {
        console.log('GPU monitoring not available');
    }
}

// Create a single initialization function
const initialize = async () => {
    try {
        tokenizer = await AutoTokenizer.from_pretrained('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2');
        model = await AutoModel.from_pretrained('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2');
        console.log('Models initialized successfully');
    } catch (error) {
        console.error('Error initializing models:', error);
        throw error;
    }
};

// Call initialization at startup
initialize();

// Update Ollama configuration
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const ollama = new Ollama({
    host: OLLAMA_HOST
});

const generate = async (context, query, tone = "professional and friendly") => {
    logSystemResources();
    const startTime = Date.now();
    
    // Optimize context length for memory efficiency
    const contextText = context.join('\n\n').slice(0, 1500);
    
    const messageContent = `
    You are DoCare AI, a healthcare chatbot. Follow these instructions:
    1. ALWAYS start with: "Thank you for consulting with DoCare AI"
    2. Structure your response with these sections:
       - Definition/Overview
       - Causes/Risk Factors
       - Symptoms
       - Treatment Options
       - Prevention/Management
    3. Keep responses complete and well-structured
    4. Use markdown formatting
    5. Maximum response length: 600 words

    Context: ${contextText}
    Question: ${query}`;

    try {
        const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama3.1',
                messages: [{
                    role: 'system',
                    content: 'You are DoCare AI, a professional healthcare chatbot.'
                }, {
                    role: 'user',
                    content: messageContent
                }],
                stream: true,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                    num_predict: 1024,    // Increased for faster completion
                    num_ctx: 1024,        // Increased context window
                    num_thread: 4,        // Use all CPU cores
                    repeat_penalty: 1.1,
                    num_cpu: 4,           // Use all CPUs
                    batch_size: 8,        // Increased for better throughput
                    seed: 42,
                    mirostat_mode: 1,     // Changed for faster responses
                    mirostat_tau: 3,      // Reduced for speed
                    mirostat_eta: 0.1,
                    num_keep: 5,          // Memory efficiency
                    num_gpu: 0,           // Explicitly disable GPU
                    rope_scaling: { type: "linear", factor: 1 } // Better performance
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('\nStreaming response:\n');
        const fullResponse = await handleResponse(response);
        
        const endTime = Date.now();
        console.log('\nGenerated Response:');
        console.log('-------------------');
        console.log(fullResponse);
        console.log('-------------------');
        console.log(`Response time: ${(endTime - startTime)/1000} seconds`);

        return fullResponse;
    } catch (error) {
        console.error("Error during generation:", error);
        throw error;
    }
}

async function generateEmbeddings(query) {
    const startTime = Date.now();
    console.log('Starting embedding generation:', new Date().toISOString());
    
    if (!model || !tokenizer) {
        throw new Error('Models not initialized');
    }
    
    try {
        const encoded = await tokenizer(query, {
            padding: true,
            truncation: true,
            max_length: 128,  // Add max length to prevent too long inputs
            return_tensors: "tf"
        });

        const embeddings = await model(encoded);
        
        // Extract the embedding values from ONNX tensor
        let embeddingArray;
        if (embeddings.last_hidden_state?.ort_tensor?.cpuData) {
            embeddingArray = Array.from(embeddings.last_hidden_state.ort_tensor.cpuData);
            // Normalize to match the expected size (384)
            const avgPooling = [];
            const seqLength = embeddingArray.length / 384;
            for (let i = 0; i < 384; i++) {
                let sum = 0;
                for (let j = 0; j < seqLength; j++) {
                    sum += embeddingArray[j * 384 + i];
                }
                avgPooling.push(sum / seqLength);
            }
            embeddingArray = avgPooling;
        } else {
            throw new Error('Unexpected embedding structure');
        }
        
        console.log('Generated embedding vector length:', embeddingArray.length);
        console.log(`Embedding generation took: ${(Date.now() - startTime)/1000}s`);
        return embeddingArray;
    } catch (error) {
        console.error("Error generating embeddings:", error);
        return null;
    }
}

async function search(query) {
    const startTime = Date.now();
    console.log('Starting vector search:', new Date().toISOString());
    
    try {
        console.log('Starting search for query:', query);
        
        const vectorArray = await generateEmbeddings(query);
        
        if (!vectorArray) {
            console.warn('Failed to generate embeddings');
            return [];
        }
        
        // Remove score_threshold to get all results first
        const results = await client.search('Healthcare', {
            vector: vectorArray,
            limit: 3
            // Removed score_threshold: 0.7
        });
        
        // Log all results with scores for debugging
        console.log('Raw search results:', results.map(r => ({
            score: r.score,
            question: r.payload.question,
            answer: r.payload.answer?.substring(0, 50) + '...' // Log first 50 chars of answer
        })));

        // Filter results if needed based on score
        const filteredResults = results.filter(r => r.score > 0.3); // More lenient threshold

        console.log('Search results after filtering:', {
            query,
            totalResults: filteredResults.length,
            scores: filteredResults.map(r => ({
                score: r.score,
                question: r.payload.question
            }))
        });

        if (!filteredResults || filteredResults.length === 0) {
            console.warn('No relevant results found for query:', query);
            return [];
        }

        console.log(`Vector search took: ${(Date.now() - startTime)/1000}s`);
        return filteredResults.map(res => `${res.payload.question} ${res.payload.answer}`);
    } catch (error) {
        console.error("Search Error:", error.message, error.stack);
        throw error;
    }
}

async function handleResponse(response) {
    if (!response.body) {
        throw new Error('Response body is null or undefined');
    }

    try {
        const reader = response.body.getReader();
        let output = '';
        const decoder = new TextDecoder();
        let buffer = '';
        
        console.log('\nGenerating Response:\n');
        console.log('-------------------\n');
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const jsonChunk = JSON.parse(line);
                        if (jsonChunk.message?.content) {
                            const newContent = jsonChunk.message.content;
                            output += newContent;
                            // Print the new content without clearing previous text
                            process.stdout.write(newContent);
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
        }
        
        console.log('\n\n-------------------');
        console.log('Response Complete!\n');
        
        return output;
    } catch (error) {
        console.error("Error handling response stream:", error);
        throw error;
    }
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

async function checkOllamaStatus() {
    try {
        const response = await fetch(`${OLLAMA_HOST}/api/tags`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Ollama available models:', data);
        return true;
    } catch (error) {
        console.error('Failed to connect to Ollama:', error.message);
        console.error('Please ensure Ollama is running with: ollama serve');
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

checkOllamaStatus()
    .then(isRunning => {
        if (!isRunning) {
            console.error('WARNING: Ollama is not running properly!');
        }
    });

// Set process priority
try {
    process.setpriority(-20);  // Highest priority
} catch (error) {
    console.log('Unable to set process priority, continuing with default');
}

module.exports = { generate, search };