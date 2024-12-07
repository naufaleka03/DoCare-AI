const { QdrantClient } = require('@qdrant/js-client-rest');
const { AutoTokenizer } = require('@huggingface/transformers');
const ollama = require('ollama');

const client = new QdrantClient("https://c56346fe-194b-4166-a930-915844d54af5.us-east-1-0.aws.cloud.qdrant.io:6333/", "RKlzScQJy5oMtooCItO2w79nVpSbH54QE92te8uZof-JfWf_sxfYxA");

let tokenizer; // Declare tokenizer variable

// Create an async function to initialize the tokenizer
const initializeTokenizer = async () => {
    tokenizer = await AutoTokenizer.from_pretrained('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2');
};

// Call the initialization function
initializeTokenizer();

async function generate(context, query, tone = "professional and friendly") {
    const contextText = context.join(' ');
    const inputText = `
    You are a healthcare chatbot. Please answer the question in a tone ${tone}.
    (Details omitted for brevity)
    `;

    try {
        const response = await ollama.chat({
            model: 'llama3.1',
            messages: [
                { role: 'system', content: inputText },
                { role: 'user', content: query }
            ],
            options: { seed: 237 },
            stream: true
        });
        return response;
    } catch (error) {
        console.error("Error during generation:", error);
        throw error;
    }
}

async function search(query) {
    try {
        // Log the incoming query
        console.log('Incoming Query:', query);

        // Tokenize the query
        const queryVector = tokenizer.encode(query, { padding: true, truncation: true });
        console.log('Query Vector:', queryVector); // Log the query vector
        console.log('Query Vector Length:', queryVector.length);

        // Perform the search
        const results = await client.search({
            collection_name: 'Healthcare',
            query_vector: queryVector[0],
            limit: 3
        });

        // Log the raw response from Qdrant
        console.log('Raw Search Results:', results);

        // Check if results are returned
        if (!results || results.length === 0) {
            console.warn('No results returned from Qdrant.');
            throw new Error('No results returned from Qdrant.');
        }

        // Log the structure of the results
        console.log('Results Structure:', JSON.stringify(results, null, 2));

        // Sort results by score
        const sortedResult = results.sort((a, b) => b.score - a.score);
        return sortedResult.map(res => `${res.payload.question} ${res.payload.answer}`);
    } catch (error) {
        console.error("Error during search:", error);
        throw error;
    }
}

module.exports = { generate, search };