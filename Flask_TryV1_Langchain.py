from flask import Flask, request, jsonify, Response
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct
import tensorflow as tf
from transformers import TFAutoModel, AutoTokenizer
import time
from langchain.llms import Ollama
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from IPython.display import display, clear_output, Markdown

class TFSentenceTransformer(tf.keras.layers.Layer):
    def __init__(self, model_name_or_path, **kwargs):
        super(TFSentenceTransformer, self).__init__()
        #Load transformers model
        self.model = TFAutoModel.from_pretrained(model_name_or_path, **kwargs)

    def call(self, inputs, normalize=True):
        #Run model on inputs
        model_output = self.model(inputs)
        #Perform pooling.
        embeddings = self.mean_pooling(model_output, inputs['attention_mask'])
        #Normalize the embeddings
        if normalize:
            embeddings = self.normalize(embeddings)
        return embeddings

    def mean_pooling(self, model_output, attention_mask):
        token_embeddings = model_output[0]
        input_mask_expanded = tf.cast(
            tf.broadcast_to(tf.expand_dims(attention_mask, -1), tf.shape(token_embeddings)),
            tf.float32
        )
        return tf.math.reduce_sum(token_embeddings * input_mask_expanded, axis=1) / tf.clip_by_value(tf.math.reduce_sum(input_mask_expanded, axis=1), 1e-9, tf.float32.max)

    def normalize(self, embeddings):
        embeddings, _ = tf.linalg.normalize(embeddings, 2, axis=1)
        return embeddings
    
app = Flask(__name__)

client = QdrantClient("https://c56346fe-194b-4166-a930-915844d54af5.us-east-1-0.aws.cloud.qdrant.io:6333/",
                      api_key = "RKlzScQJy5oMtooCItO2w79nVpSbH54QE92te8uZof-JfWf_sxfYxA")

model_id = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = TFSentenceTransformer(model_id)

llama = Ollama(model="llama3.1")

prompt_template = PromptTemplate(
    input_variables=["context", "query", "tone"],
    template="""
    You are a healthcare chatbot. Please answer the question in a tone {tone}.
    Give all the answers related to the question disease. If there is no answer related to the disease, don't say "no information", but say "this is the only information I got". Do not make up an answer.
    If the answer is not available, don't answer, do not make up an answer.
    Clean up the answer
    Here are some rules on how to answer:
    - Use language that is {tone}
    - Before answering say "Thank you for consulting with DoCare AI"
    - At the end of the answer say "Hope this information helps and wish you a speedy recovery and say thank you"
    - Answer questions based on the language of the question given.
    The following is informational text to answer questions later:
    
    {context}
    
    
    After you read the informational text, answer the following questions clearly according to the question.
    Question: {query}
    """
)

llm_chain = LLMChain(
    llm=llama,
    prompt=prompt_template
    
)

def generate(context, query, tone="professional and friendly"):
    context_text = ' '.join(context)
    response = llm_chain.run(context=context_text, query=query, tone=tone)
    return response

def search(query):
    query_vector = tokenizer(query, padding=True, truncation=True, return_tensors="tf")

    query_vector = model(query_vector).numpy().tolist()

    # Perform search in Qdrant
    results = client.search(
        collection_name='Healthcare',
        query_vector=query_vector[0],
        limit=3
    )

    sorted_result = sorted(results, key=lambda x: x.score, reverse=True)

    # Return formatted results
    return [res.payload['question'] + ' ' + res.payload['answer'] for res in sorted_result]

@app.route("/query", methods=['POST'])
def answer():
    try:
        question = request.get_json()
        query = question.get('query')

        if not query:
            return jsonify({'error': 'Query is required'}), 400

        result = search(query)
        response = generate(result, query)

        return Response(response, mimetype='text/plain')
    except Exception as e:
        return jsonify({'error': str(e)}), 500



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
    