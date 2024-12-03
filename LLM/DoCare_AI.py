#Import Library
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct
import tensorflow as tf
from transformers import TFAutoModel
from transformers import AutoTokenizer

#Database Initialization
client = QdrantClient("http://34.101.137.149:6333")

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

#Model ID
model_id = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'

#Load model and tokenizer
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = TFSentenceTransformer(model_id)

def search(query):
    # Tokenize query
    query_vector = tokenizer(query, padding=True, truncation=True, return_tensors="tf")

    # Generate embeddings using the model
    query_vector = model(query_vector).numpy().tolist()

    # Perform search in Qdrant
    results = client.search(
        collection_name='Healthcare',
        query_vector=query_vector[0],  # Use the first embedding in the batch
        limit=3
    )

    # Sort results by score
    sorted_result = sorted(results, key=lambda x: x.score, reverse=True)

    # Return formatted results
    return [res.payload['question'] + ' ' + res.payload['answer'] for res in sorted_result]
