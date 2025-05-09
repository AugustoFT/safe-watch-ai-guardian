
#!/usr/bin/env python3
# ml/evaluate.py - Script para avaliar modelos de detecção do SafeWatch

import os
import json
import argparse
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime
from pathlib import Path
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import cv2

def parse_arguments():
    parser = argparse.ArgumentParser(description='Avalia modelo de detecção do SafeWatch')
    parser.add_argument('--model-path', type=str, required=True, help='Caminho do modelo treinado')
    parser.add_argument('--data-dir', type=str, default='data/processed/images_test', help='Diretório com dados de teste')
    parser.add_argument('--output-dir', type=str, default='evaluation', help='Diretório para salvar resultados')
    parser.add_argument('--batch-size', type=int, default=32, help='Tamanho do batch')
    parser.add_argument('--image-size', type=int, default=224, help='Tamanho das imagens')
    parser.add_argument('--confusion-matrix', action='store_true', help='Gerar matriz de confusão')
    parser.add_argument('--examples', action='store_true', help='Gerar exemplos de predições')
    parser.add_argument('--supabase-url', type=str, help='URL do Supabase para registrar métricas')
    parser.add_argument('--supabase-key', type=str, help='Chave do Supabase para registrar métricas')
    return parser.parse_args()

def load_test_data(data_dir, batch_size, image_size):
    """Carrega dados de teste"""
    print(f"Carregando dados de teste de {data_dir}...")
    
    test_datagen = ImageDataGenerator(rescale=1./255)
    test_generator = test_datagen.flow_from_directory(
        data_dir,
        target_size=(image_size, image_size),
        batch_size=batch_size,
        class_mode='categorical',
        shuffle=False
    )
    
    class_indices = test_generator.class_indices
    print(f"Classes encontradas: {class_indices}")
    
    return test_generator, class_indices

def evaluate_model(model, test_generator, class_indices, output_dir):
    """Avalia o modelo e gera métricas"""
    print("Avaliando modelo...")
    
    # Inverter mapeamento de classes
    class_labels = {v: k for k, v in class_indices.items()}
    
    # Gerar predições
    y_pred_prob = model.predict(test_generator)
    y_pred = np.argmax(y_pred_prob, axis=1)
    
    # Obter rótulos reais
    y_true = test_generator.classes
    
    # Limitar ao número correto de amostras
    samples_count = test_generator.samples
    y_pred = y_pred[:samples_count]
    y_true = y_true[:samples_count]
    
    # Calcular métricas
    accuracy = accuracy_score(y_true, y_pred)
    precision = precision_score(y_true, y_pred, average='weighted')
    recall = recall_score(y_true, y_pred, average='weighted')
    f1 = f1_score(y_true, y_pred, average='weighted')
    
    print(f"Accuracy: {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall: {recall:.4f}")
    print(f"F1 Score: {f1:.4f}")
    
    # Relatório completo
    class_names = list(class_indices.keys())
    report = classification_report(y_true, y_pred, target_names=class_names, output_dict=True)
    print(classification_report(y_true, y_pred, target_names=class_names))
    
    # Matriz de confusão
    cm = confusion_matrix(y_true, y_pred)
    
    # Criar diretório de saída se não existir
    os.makedirs(output_dir, exist_ok=True)
    
    # Plotar matriz de confusão
    plt.figure(figsize=(10, 8))
    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title('Matriz de Confusão')
    plt.colorbar()
    tick_marks = np.arange(len(class_indices))
    plt.xticks(tick_marks, [class_labels[i] for i in range(len(class_labels))], rotation=45)
    plt.yticks(tick_marks, [class_labels[i] for i in range(len(class_labels))])
    plt.tight_layout()
    plt.ylabel('Rótulo Verdadeiro')
    plt.xlabel('Rótulo Predito')
    cm_path = os.path.join(output_dir, "confusion_matrix.png")
    plt.savefig(cm_path)
    print(f"Matriz de confusão salva em {cm_path}")
    
    # Salvar métricas em JSON
    model_name = os.path.basename(args.model_path).split('.')[0]
    metrics = {
        'model_name': model_name,
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1),
        'class_report': report,
        'confusion_matrix': cm.tolist(),
        'evaluation_date': datetime.now().isoformat(),
        'number_of_classes': len(class_indices),
        'classes': class_names,
    }
    
    metrics_path = os.path.join(output_dir, "evaluation_metrics.json")
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    print(f"Métricas salvas em {metrics_path}")
    
    return metrics, y_pred, y_pred_prob, y_true

def generate_examples(model, test_generator, class_indices, y_pred, output_dir, num_examples=5):
    """Gera exemplos visuais de predições corretas e incorretas"""
    print("Gerando exemplos de predições...")
    
    # Inverter mapeamento de classes
    class_labels = {v: k for k, v in class_indices.items()}
    
    # Obter dados originais
    images = []
    labels = []
    
    # Resetar o gerador e obter imagens e rótulos
    test_generator.reset()
    for i in range(min(len(test_generator), int(np.ceil(test_generator.samples / test_generator.batch_size)))):
        batch = test_generator.next()
        images.extend(batch[0])
        labels.extend(np.argmax(batch[1], axis=1))
        if len(images) >= test_generator.samples:
            break
    
    # Limitar ao número correto de amostras
    images = images[:test_generator.samples]
    labels = labels[:test_generator.samples]
    
    # Encontrar exemplos corretos e incorretos para cada classe
    os.makedirs(os.path.join(output_dir, "examples"), exist_ok=True)
    
    for class_idx, class_name in class_labels.items():
        # Diretórios para exemplos
        correct_dir = os.path.join(output_dir, "examples", f"{class_name}_correct")
        incorrect_dir = os.path.join(output_dir, "examples", f"{class_name}_incorrect")
        os.makedirs(correct_dir, exist_ok=True)
        os.makedirs(incorrect_dir, exist_ok=True)
        
        # Índices para esta classe
        class_indices = np.where(np.array(labels) == class_idx)[0]
        
        # Encontrar predições corretas e incorretas
        correct_indices = [i for i in class_indices if y_pred[i] == class_idx]
        incorrect_indices = [i for i in class_indices if y_pred[i] != class_idx]
        
        # Salvar exemplos corretos
        for i, idx in enumerate(np.random.choice(correct_indices, size=min(num_examples, len(correct_indices)), replace=False)):
            img = images[idx]
            # Converter de volta para 0-255 e BGR
            img = (img * 255).astype(np.uint8)
            if img.shape[2] == 3:  # RGB para BGR
                img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            cv2.imwrite(os.path.join(correct_dir, f"correct_{i}.jpg"), img)
        
        # Salvar exemplos incorretos
        for i, idx in enumerate(np.random.choice(incorrect_indices, size=min(num_examples, len(incorrect_indices)), replace=False)):
            img = images[idx]
            img = (img * 255).astype(np.uint8)
            if img.shape[2] == 3:
                img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            predicted = class_labels[y_pred[idx]]
            cv2.imwrite(os.path.join(incorrect_dir, f"incorrect_{i}_pred_{predicted}.jpg"), img)
    
    print(f"Exemplos salvos em {os.path.join(output_dir, 'examples')}")

def register_metrics_to_supabase(supabase_url, supabase_key, metrics):
    """Registra métricas da avaliação no Supabase"""
    if not supabase_url or not supabase_key:
        print("Aviso: URL ou chave do Supabase não fornecidos, métricas não serão registradas.")
        return
    
    import requests
    
    # Preparar dados para inserção ou atualização
    data = {
        'model_name': metrics['model_name'],
        'version': datetime.now().strftime("%Y%m%d_%H%M%S"),
        'accuracy': metrics['accuracy'],
        'precision': metrics['precision'],
        'recall': metrics['recall'],
        'f1_score': metrics['f1_score'],
        'parameters': {
            'classes': metrics['classes'],
            'number_of_classes': metrics['number_of_classes'],
            'evaluation_date': metrics['evaluation_date']
        }
    }
    
    # Enviar dados para Supabase
    try:
        # Verificar se já existe registro para este modelo
        response = requests.get(
            f"{supabase_url}/rest/v1/model_metrics",
            params={'select': 'id', 'model_name': f'eq.{metrics["model_name"]}'},
            headers={
                'apikey': supabase_key,
                'Authorization': f'Bearer {supabase_key}'
            }
        )
        
        if response.status_code == 200 and response.json():
            # Atualizar registro existente
            model_id = response.json()[0]['id']
            update_response = requests.patch(
                f"{supabase_url}/rest/v1/model_metrics?id=eq.{model_id}",
                json=data,
                headers={
                    'apikey': supabase_key,
                    'Authorization': f'Bearer {supabase_key}',
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                }
            )
            if update_response.status_code == 200:
                print("Métricas de avaliação atualizadas com sucesso no Supabase.")
            else:
                print(f"Erro ao atualizar métricas: {update_response.status_code} - {update_response.text}")
        else:
            # Criar novo registro
            insert_response = requests.post(
                f"{supabase_url}/rest/v1/model_metrics",
                json=data,
                headers={
                    'apikey': supabase_key,
                    'Authorization': f'Bearer {supabase_key}',
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                }
            )
            if insert_response.status_code == 201:
                print("Métricas de avaliação registradas com sucesso no Supabase.")
            else:
                print(f"Erro ao registrar métricas: {insert_response.status_code} - {insert_response.text}")
    
    except Exception as e:
        print(f"Erro ao conectar ao Supabase: {e}")

def main():
    global args
    args = parse_arguments()
    
    # Carregar modelo
    print(f"Carregando modelo de {args.model_path}...")
    model = load_model(args.model_path)
    
    # Carregar dados de teste
    test_generator, class_indices = load_test_data(args.data_dir, args.batch_size, args.image_size)
    
    # Avaliar modelo
    metrics, y_pred, y_pred_prob, y_true = evaluate_model(model, test_generator, class_indices, args.output_dir)
    
    # Gerar exemplos se solicitado
    if args.examples:
        generate_examples(model, test_generator, class_indices, y_pred, args.output_dir)
    
    # Registrar métricas no Supabase
    register_metrics_to_supabase(args.supabase_url, args.supabase_key, metrics)
    
    print("Avaliação concluída!")

if __name__ == "__main__":
    main()
