import pandas as pd
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct
import tensorflow as tf
from transformers import TFAutoModel
from transformers import AutoTokenizer
import time

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

def data():
    dataset = pd.read_csv('medquad.csv')

    dataset.drop_duplicates(inplace=True)

    dataset.dropna(inplace=True)

    model_id = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'

    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = TFSentenceTransformer(model_id)

    dataset['question_answer'] = dataset['question'].fillna('') + ' ' + dataset['answer'].fillna('')

    batch_size = 32

    def process_in_batches(data, batch_size):
        for i in range(0, len(data), batch_size):
            yield data[i:i + batch_size]

    qa = dataset['question_answer'].tolist()

    tokenized_qa = tokenizer(qa, padding=True, truncation=True, return_tensors='tf')

    qa_dataset = tf.data.Dataset.from_tensor_slices(tokenized_qa)
    qa_dataset = qa_dataset.batch(batch_size)
    qa_dataset = qa_dataset.prefetch(tf.data.AUTOTUNE)

    all_embeddings = []
    batch_num = 1

    start_time = time.time()

    for batch in qa_dataset:
        batch_embeddings = model(batch)
        embeddings_list = [embedding.numpy().tolist() for embedding in batch_embeddings]
        all_embeddings.extend(embeddings_list)

        print(f"Uploaded Batch {batch_num}")
        batch_num += 1

    total_time = time.time() - start_time
    print(f"Total Processing Time: {total_time:.2f} seconds")

    client = QdrantClient("http://10.12.9.105:6333")
    
    client.delete_collection(collection_name='{Healthcare}')
    
    #Input Data to Qdrant
    client.recreate_collection(
        collection_name='Healthcare',
        vectors_config=VectorParams(
            size=(len(all_embeddings[0])),
            distance=Distance.COSINE
        )
    )

    points = [
        PointStruct(
            id=i,
            vector=all_embeddings[i],
            payload={"question" : dataset['question'].iloc[i], 'answer' : dataset['answer'].iloc[i]}
        )
        for i in range(len(all_embeddings))
    ]

    batch_size = 500

    #Split data to smaller batches
    for i in range(0, len(points), batch_size):
        batch_points = points[i:i+batch_size]
        
        client.upsert(
            collection_name='Healthcare',
            wait=True,
            points=batch_points
        )
        print(f'Uploaded batch {i // batch_size + 1}')

data()

