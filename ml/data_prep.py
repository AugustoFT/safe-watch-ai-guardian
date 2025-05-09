
#!/usr/bin/env python3
# ml/data_prep.py - Script para preparar dados para treinamento do modelo

import os
import sys
import json
import argparse
import numpy as np
import pandas as pd
from pathlib import Path
from typing import List, Dict, Any, Tuple
import cv2
from tqdm import tqdm
import boto3
from datetime import datetime
import io

def parse_arguments():
    parser = argparse.ArgumentParser(description='Prepara dados para treinamento do modelo SafeWatch')
    parser.add_argument('--input-dir', type=str, default='data/raw', help='Diretório com dados brutos')
    parser.add_argument('--output-dir', type=str, default='data/processed', help='Diretório de saída')
    parser.add_argument('--from-s3', action='store_true', help='Baixar dados do S3')
    parser.add_argument('--s3-bucket', type=str, help='Bucket S3 para dados')
    parser.add_argument('--s3-prefix', type=str, default='frames/', help='Prefixo S3')
    parser.add_argument('--annotations-file', type=str, help='Arquivo de anotações dos frames')
    parser.add_argument('--image-size', type=int, default=224, help='Tamanho de redimensionamento')
    parser.add_argument('--test-split', type=float, default=0.2, help='Proporção de teste')
    return parser.parse_args()

def download_from_s3(bucket: str, prefix: str, output_dir: str) -> List[str]:
    """Baixa frames do S3 e retorna lista de caminhos"""
    print(f"Baixando dados do S3 bucket '{bucket}' com prefixo '{prefix}'...")
    
    s3 = boto3.client('s3')
    
    # Listar objetos no bucket
    objects = []
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        if 'Contents' in page:
            objects.extend(page['Contents'])
    
    # Criar diretório de saída se não existir
    os.makedirs(output_dir, exist_ok=True)
    
    # Baixar cada objeto
    file_paths = []
    for obj in tqdm(objects, desc="Baixando frames"):
        if not obj['Key'].endswith(('.jpg', '.jpeg', '.png')):
            continue
        
        # Definir caminho local
        filename = os.path.basename(obj['Key'])
        filepath = os.path.join(output_dir, filename)
        
        # Baixar arquivo
        s3.download_file(bucket, obj['Key'], filepath)
        file_paths.append(filepath)
    
    print(f"Download concluído. {len(file_paths)} arquivos baixados.")
    return file_paths

def load_annotations(annotations_file: str) -> Dict[str, str]:
    """Carrega anotações de arquivo JSON ou CSV"""
    if annotations_file.endswith('.json'):
        with open(annotations_file, 'r') as f:
            return json.load(f)
    elif annotations_file.endswith('.csv'):
        df = pd.read_csv(annotations_file)
        return dict(zip(df['filename'], df['label']))
    else:
        raise ValueError(f"Formato de arquivo não suportado: {annotations_file}")

def process_images(file_paths: List[str], annotations: Dict[str, str], 
                  output_dir: str, image_size: int) -> List[Dict[str, Any]]:
    """Processa imagens e retorna metadados"""
    os.makedirs(output_dir, exist_ok=True)
    
    # Diretórios para cada classe
    class_dirs = set(annotations.values())
    for cls in class_dirs:
        os.makedirs(os.path.join(output_dir, cls), exist_ok=True)
    
    metadata = []
    for filepath in tqdm(file_paths, desc="Processando imagens"):
        filename = os.path.basename(filepath)
        
        # Verificar se há anotação para este arquivo
        if filename not in annotations:
            print(f"Aviso: Não há anotação para {filename}")
            continue
        
        label = annotations[filename]
        
        try:
            # Ler imagem
            image = cv2.imread(filepath)
            if image is None:
                raise ValueError(f"Não foi possível ler a imagem: {filepath}")
            
            # Pré-processamento: redimensionar, equalizar histograma, etc.
            image = cv2.resize(image, (image_size, image_size))
            
            # Converter para espaço de cor adequado
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Salvar imagem processada
            output_file = os.path.join(output_dir, label, filename)
            cv2.imwrite(output_file, image)
            
            # Extrair features básicas para metadados
            average_brightness = np.mean(image)
            std_brightness = np.std(image)
            
            # Adicionar metadados
            metadata.append({
                'filename': filename,
                'label': label,
                'processed_path': output_file,
                'brightness_mean': float(average_brightness),
                'brightness_std': float(std_brightness),
                'width': image_size,
                'height': image_size
            })
            
        except Exception as e:
            print(f"Erro ao processar {filepath}: {e}")
    
    return metadata

def split_train_test(metadata: List[Dict[str, Any]], test_split: float) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Divide os dados em conjuntos de treinamento e teste"""
    df = pd.DataFrame(metadata)
    
    # Garantir divisão estratificada por classe
    from sklearn.model_selection import train_test_split
    train_df, test_df = train_test_split(df, test_size=test_split, stratify=df['label'], random_state=42)
    
    return train_df.to_dict('records'), test_df.to_dict('records')

def save_metadata(train_data: List[Dict[str, Any]], test_data: List[Dict[str, Any]], output_dir: str):
    """Salva metadados em arquivos JSON"""
    os.makedirs(output_dir, exist_ok=True)
    
    train_file = os.path.join(output_dir, 'train_metadata.json')
    test_file = os.path.join(output_dir, 'test_metadata.json')
    
    # Salvar como JSON
    with open(train_file, 'w') as f:
        json.dump(train_data, f, indent=2)
    
    with open(test_file, 'w') as f:
        json.dump(test_data, f, indent=2)
    
    # Também salvar como CSV para análise fácil
    pd.DataFrame(train_data).to_csv(os.path.join(output_dir, 'train_metadata.csv'), index=False)
    pd.DataFrame(test_data).to_csv(os.path.join(output_dir, 'test_metadata.csv'), index=False)
    
    print(f"Metadados salvos em {output_dir}")
    print(f"Conjunto de treinamento: {len(train_data)} amostras")
    print(f"Conjunto de teste: {len(test_data)} amostras")

def main():
    args = parse_arguments()
    
    # Criar diretórios
    os.makedirs(args.output_dir, exist_ok=True)
    raw_dir = os.path.join(args.input_dir)
    processed_dir = os.path.join(args.output_dir, 'images')
    metadata_dir = os.path.join(args.output_dir, 'metadata')
    
    # Baixar ou localizar arquivos
    if args.from_s3:
        if not args.s3_bucket:
            print("Erro: --s3-bucket é obrigatório quando --from-s3 está habilitado")
            sys.exit(1)
        file_paths = download_from_s3(args.s3_bucket, args.s3_prefix, raw_dir)
    else:
        if not os.path.exists(raw_dir):
            print(f"Erro: Diretório de entrada {raw_dir} não existe")
            sys.exit(1)
        file_paths = [os.path.join(raw_dir, f) for f in os.listdir(raw_dir) 
                      if f.endswith(('.jpg', '.jpeg', '.png'))]
    
    # Carregar anotações
    if args.annotations_file and os.path.exists(args.annotations_file):
        annotations = load_annotations(args.annotations_file)
    else:
        print("Aviso: Arquivo de anotações não fornecido. Usando nomes de arquivo para inferir classes.")
        # Inferir classe do nome do arquivo (por exemplo, "fall_001.jpg" -> "fall")
        annotations = {}
        for filepath in file_paths:
            filename = os.path.basename(filepath)
            if '_' in filename:
                label = filename.split('_')[0]
                annotations[filename] = label
            else:
                print(f"Aviso: Não foi possível inferir classe para {filename}")
    
    # Processar imagens
    metadata = process_images(file_paths, annotations, processed_dir, args.image_size)
    
    # Dividir em conjuntos de treinamento e teste
    train_data, test_data = split_train_test(metadata, args.test_split)
    
    # Salvar metadados
    save_metadata(train_data, test_data, metadata_dir)
    
    print("Preparação de dados concluída com sucesso!")

if __name__ == "__main__":
    main()
