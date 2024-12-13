# DoCare AI - Quick Aid & Smart Guidance - Machine Learning

## Bangkit Capstone Project 2024
Capstone Team ID : C242-PS530<br>
This is a Machine Learning repository.

## Machine Learning Schedule
|Task  |Week 1         |Week 2                 |Week 3                 |Week 4                 |Week 5                 |Week 6          |
|:----:|:-------------:|:---------------------:|:---------------------:|:---------------------:|:---------------------:|:--------------:|
|Task 1|Data Collection|                       |                       |                       |                       |                |
|Task 2|               |Data Preparation       |                       |                       |                       |                |
|Task 3|               |LLM Train & Fine Tuning|LLM Train & Fine Tuning|LLM Train & Fine Tuning|LLM Train & Fine Tuning|                |
|Task 4|               |                       |                       |                       |                       |Model Evaluation|
|Task 5|               |                       |                       |                       |                       |Model Deployment|

## Architecture
![ML Architecture](https://github.com/naufaleka03/DoCare-AI/blob/main/Assets/ML_Architecture.png)

## How to Use
- Clone repository github branch Machine-Learning
- Install Python version >= 3.9.18.
- Pull Docker Qdrant docker pull qdrant/qdrant
- Pull Docker Ollama Ollama docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
- Run a model  Ollama docker exec -it ollama ollama run llama3.1:8b
- Install dependencies pip install -r requirements.txt
- Run DoCare_AI.ipynb
- Run LLM.ipynb
