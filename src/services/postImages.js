import { supabase } from './supabase';

import { File } from 'expo-file-system';


// Enviar imagem de uma publicação
export async function enviarImagemPublicacao(userId, imagem) {

    if (!userId || !imagem?.uri) {
        throw new Error('Imagem ou usuário inválido.');
    }

    const extensao = imagem.mimeType?.split('/')[1]
        || imagem.uri.split('.').pop()?.split('?')[0]
        || 'jpg';

    const nomeArquivo = `${userId}/imagem-${Date.now()}.${extensao}`;

    // Ler imagem usando o sistema de arquivos do Expo
    const arquivoLocal = new File(imagem.uri);

    const arquivo = await arquivoLocal.arrayBuffer();

    console.log('URI:', imagem.uri);
    console.log('MIME:', imagem.mimeType);
    console.log('Tamanho do arquivo:', arquivo.byteLength);

    if (!arquivo || arquivo.byteLength <= 100) {
        throw new Error(
            'A imagem selecionada está vazia ou inválida.'
        );
    }

    // Enviar para o Supabase Storage
    const { error } = await supabase
        .storage
        .from('post-images')
        .upload(nomeArquivo, arquivo, {
            contentType: imagem.mimeType || 'image/jpeg',
            upsert: false
        });

    if (error) {
        throw error;
    }

    // Gerar URL pública
    const { data } = supabase
        .storage
        .from('post-images')
        .getPublicUrl(nomeArquivo);

    return data.publicUrl;

}


// Excluir imagem de uma publicação
export async function excluirImagemPublicacao(imageUrl) {

    if (!imageUrl) {
        return;
    }

    const marcador = '/storage/v1/object/public/post-images/';

    const indice = imageUrl.indexOf(marcador);

    if (indice === -1) {
        return;
    }

    const caminho = decodeURIComponent(
        imageUrl.substring(indice + marcador.length)
    );

    const { error } = await supabase
        .storage
        .from('post-images')
        .remove([caminho]);

    if (error) {
        throw error;
    }

}