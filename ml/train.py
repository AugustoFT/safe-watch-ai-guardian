
#!/usr/bin/env python3
# ml/train.py - Script para treinar modelo de detecção do SafeWatch

import os
import json
import argparse
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime
from pathlib import Path
import boto3
import tensorflow as tf
from tensorflow.keras import layers, models, applications, optimizers
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_score, recall_score, f1_score
import io
import cv2

def parse_arguments():
    parser = argparse.ArgumentParser(description='Treina modelo de detecção do SafeWatch')
    parser.add_argument('--data-dir', type=str, default='data/processed', help='Diretório com dados processados')
    parser.add_argument('--output-dir', type=str, default='models', help='Diretório para salvar modelo')
    parser.add_argument('--model-type', type=str, default='mobilenet', 
                        choices=['mobilenet', 'resnet', 'efficientnet'], help='Tipo de modelo base')
    parser.add_argument('--epochs', type=int, default=50, help='Número de épocas')
    parser.add_argument('--batch-size', type=int, default=32, help='Tamanho do batch')
    parser.add_argument('--learning-rate', type=float, default=0.001, help='Taxa de aprendizado')
    parser.add_argument('--image-size', type=int, default=224, help='Tamanho das imagens')
    parser.add_argument('--save-to-s3', action='store_true', help='Salvar modelo no S3')
    parser.add_argument('--s3-bucket', type=str, help='Bucket S3 para salvar modelo')
    parser.add_argument('--supabase-url', type=str, help='URL do Supabase para registrar métricas')
    parser.add_argument('--supabase-key', type=str, help='Chave do Supabase para registrar métricas')
    return parser.parse_args()

def create_model(model_type: str, input_shape: tuple, num_classes: int):
    """Cria o modelo de detecção com base em uma arquitetura pré-treinada"""
    print(f"Criando modelo baseado em {model_type}...")
    
    # Seleção do modelo base
    if model_type == 'mobilenet':
        base_model = applications.MobileNetV2(
            weights='imagenet', include_top=False, input_shape=input_shape)
    elif model_type == 'resnet':
        base_model = applications.ResNet50V2(
            weights='imagenet', include_top=False, input_shape=input_shape)
    elif model_type == 'efficientnet':
        base_model = applications.EfficientNetB0(
            weights='imagenet', include_top=False, input_shape=input_shape)
    else:
        raise ValueError(f"Tipo de modelo inválido: {model_type}")
    
    # Congelar camadas do modelo base para transferência de aprendizado
    base_model.trainable = False
    
    # Construir modelo completo
    model = models.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.BatchNormalization(),
        layers.Dropout(0.5),
        layers.Dense(512, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.3),
        layers.Dense(num_classes, activation='softmax')
    ])
    
    # Compilar modelo
    model.compile(
        optimizer=optimizers.Adam(),
        loss='categorical_crossentropy',
        metrics=['accuracy', tf.keras.metrics.Precision(), tf.keras.metrics.Recall()]
    )
    
    return model

def create_data_generators(train_dir, val_dir, batch_size, image_size):
    """Cria geradores de dados para treinamento e validação"""
    
    # Aumentação de dados para conjunto de treinamento
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        fill_mode='nearest'
    )
    
    # Apenas normalização para conjunto de validação
    val_datagen = ImageDataGenerator(rescale=1./255)
    
    # Geradores
    train_generator = train_datagen.flow_from_directory(
        train_dir,
        target_size=(image_size, image_size),
        batch_size=batch_size,
        class_mode='categorical',
        shuffle=True
    )
    
    val_generator = val_datagen.flow_from_directory(
        val_dir,
        target_size=(image_size, image_size),
        batch_size=batch_size,
        class_mode='categorical',
        shuffle=False
    )
    
    return train_generator, val_generator, train_generator.class_indices

def train_model(model, train_generator, val_generator, epochs, output_dir, model_name):
    """Treina o modelo usando os geradores de dados"""
    
    # Criar diretório de saída se não existir
    os.makedirs(output_dir, exist_ok=True)
    
    # Callbacks para melhor treinamento
    checkpoint = ModelCheckpoint(
        os.path.join(output_dir, f"{model_name}_best.h5"),
        monitor='val_accuracy',
        save_best_only=True,
        mode='max',
        verbose=1
    )
    
    early_stopping = EarlyStopping(
        monitor='val_loss',
        patience=10,
        restore_best_weights=True,
        verbose=1
    )
    
    reduce_lr = ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.2,
        patience=5,
        min_lr=1e-6,
        verbose=1
    )
    
    # Treinar modelo
    history = model.fit(
        train_generator,
        epochs=epochs,
        validation_data=val_generator,
        callbacks=[checkpoint, early_stopping, reduce_lr]
    )
    
    # Salvar modelo final
    model.save(os.path.join(output_dir, f"{model_name}_final.h5"))
    model.save(os.path.join(output_dir, f"{model_name}_final_tf"), save_format='tf')
    
    # Salvar histórico de treinamento
    hist_df = pd.DataFrame(history.history)
    hist_csv_file = os.path.join(output_dir, f"{model_name}_history.csv")
    hist_df.to_csv(hist_csv_file)
    
    return history, model

def evaluate_model(model, val_generator, class_indices, output_dir, model_name):
    """Avalia o modelo e gera métricas"""
    
    # Inverter mapeamento de classes
    class_labels = {v: k for k, v in class_indices.items()}
    
    # Gerar predições
    y_pred_prob = model.predict(val_generator)
    y_pred = np.argmax(y_pred_prob, axis=1)
    
    # Obter rótulos reais
    y_true = val_generator.classes
    
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
    report = classification_report(y_true, y_pred, target_names=list(class_indices.keys()), output_dict=True)
    
    # Matriz de confusão
    cm = confusion_matrix(y_true, y_pred)
    
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
    plt.savefig(os.path.join(output_dir, f"{model_name}_confusion_matrix.png"))
    
    # Histórico de acurácia e perda
    plt.figure(figsize=(12, 5))
    plt.subplot(1, 2, 1)
    plt.plot(history.history['accuracy'])
    plt.plot(history.history['val_accuracy'])
    plt.title('Acurácia do Modelo')
    plt.ylabel('Acurácia')
    plt.xlabel('Época')
    plt.legend(['Treino', 'Validação'], loc='lower right')
    
    plt.subplot(1, 2, 2)
    plt.plot(history.history['loss'])
    plt.plot(history.history['val_loss'])
    plt.title('Perda do Modelo')
    plt.ylabel('Perda')
    plt.xlabel('Época')
    plt.legend(['Treino', 'Validação'], loc='upper right')
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, f"{model_name}_training_history.png"))
    
    # Salvar métricas em JSON
    metrics = {
        'model_name': model_name,
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1),
        'class_report': report,
        'confusion_matrix': cm.tolist(),
        'training_date': datetime.now().isoformat(),
        'number_of_classes': len(class_indices),
        'classes': list(class_indices.keys()),
    }
    
    with open(os.path.join(output_dir, f"{model_name}_metrics.json"), 'w') as f:
        json.dump(metrics, f, indent=2)
    
    return metrics

def save_to_s3(local_dir, s3_bucket, s3_prefix, model_name):
    """Salva modelo e artefatos no S3"""
    s3 = boto3.client('s3')
    
    # Listar arquivos para upload
    files_to_upload = []
    for root, dirs, files in os.walk(local_dir):
        for file in files:
            if model_name in file:  # Só enviar arquivos relacionados ao modelo atual
                local_path = os.path.join(root, file)
                # Caminho relativo no S3
                s3_path = os.path.join(s3_prefix, file)
                files_to_upload.append((local_path, s3_path))
    
    # Upload de cada arquivo
    for local_path, s3_path in files_to_upload:
        print(f"Enviando {local_path} para s3://{s3_bucket}/{s3_path}")
        s3.upload_file(local_path, s3_bucket, s3_path)
    
    # URL do modelo no S3
    model_path = f"s3://{s3_bucket}/{s3_prefix}/{model_name}_final_tf"
    print(f"Modelo salvo em: {model_path}")
    return model_path

def register_metrics_to_supabase(supabase_url, supabase_key, metrics, model_path):
    """Registra métricas do modelo no Supabase"""
    if not supabase_url or not supabase_key:
        print("Aviso: URL ou chave do Supabase não fornecidos, métricas não serão registradas.")
        return
    
    import requests
    
    # Preparar dados para inserção
    data = {
        'model_name': metrics['model_name'],
        'version': datetime.now().strftime("%Y%m%d_%H%M%S"),
        'accuracy': metrics['accuracy'],
        'precision': metrics['precision'],
        'recall': metrics['recall'],
        'f1_score': metrics['f1_score'],
        'parameters': {
            'classes': metrics['classes'],
            'number_of_classes': metrics['number_of_classes']
        },
        'training_date': metrics['training_date'],
        'model_path': model_path
    }
    
    # Enviar dados para Supabase
    try:
        response = requests.post(
            f"{supabase_url}/rest/v1/model_metrics",
            json=data,
            headers={
                'apikey': supabase_key,
                'Authorization': f'Bearer {supabase_key}',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        )
        
        if response.status_code == 201:
            print("Métricas registradas com sucesso no Supabase.")
        else:
            print(f"Erro ao registrar métricas: {response.status_code} - {response.text}")
    
    except Exception as e:
        print(f"Erro ao conectar ao Supabase: {e}")

def main():
    args = parse_arguments()
    
    # Definir diretórios
    train_dir = os.path.join(args.data_dir, 'images_train')
    val_dir = os.path.join(args.data_dir, 'images_test')
    model_name = f"safewatch_{args.model_type}_{datetime.now().strftime('%Y%m%d_%H%M')}"
    
    # Criar geradores de dados
    train_generator, val_generator, class_indices = create_data_generators(
        train_dir, val_dir, args.batch_size, args.image_size)
    
    print(f"Classes encontradas: {class_indices}")
    
    # Criar modelo
    input_shape = (args.image_size, args.image_size, 3)
    model = create_model(args.model_type, input_shape, len(class_indices))
    
    # Resumo do modelo
    model.summary()
    
    # Treinar modelo
    global history  # Para uso na função evaluate_model
    history, model = train_model(model, train_generator, val_generator, 
                              args.epochs, args.output_dir, model_name)
    
    # Avaliar modelo
    metrics = evaluate_model(model, val_generator, class_indices, args.output_dir, model_name)
    
    # Salvar no S3 se solicitado
    model_path = None
    if args.save_to_s3 and args.s3_bucket:
        s3_prefix = f"models/{model_name}"
        model_path = save_to_s3(args.output_dir, args.s3_bucket, s3_prefix, model_name)
    
    # Registrar métricas no Supabase
    register_metrics_to_supabase(args.supabase_url, args.supabase_key, metrics, model_path)
    
    print(f"Treinamento concluído! Modelo salvo como {model_name}")

if __name__ == "__main__":
    main()
