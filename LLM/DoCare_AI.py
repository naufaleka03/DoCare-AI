#Import Library
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
import torch
from qdrant_client.http.models import Distance, VectorParams, PointStruct

#Inisialisasi Database dan Model Embedding
client = QdrantClient("http://10.12.9.105:6333")

model = SentenceTransformer('paraphrase-multilingual-mpnet-base-v2', device='cuda' if torch.cuda.is_available() else 'cpu')

def search(query):
    query_vector= model.encode(query)
    results = client.search(
        collection_name = 'Healthcare',
        query_vector=query_vector,
        limit = 3
    )
    #Mengurutkan hasil berdasarkan skor relevansi
    sorted_result = sorted(results, key=lambda x: x.score, reverse=True)
    return [res.payload['question'] + ' ' + res.payload['answer'] for res in sorted_result]