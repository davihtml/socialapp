import { supabase } from './supabase';


// Enviar foto de perfil
export async function atualizarAvatar(userId, imagem, avatarAtual) {

    if (!userId || !imagem?.uri) {
        throw new Error('Imagem ou usuário inválido.');
    }

    const extensao = imagem.mimeType?.split('/')[1]
        || imagem.uri.split('.').pop()?.split('?')[0]
        || 'jpg';

    const nomeArquivo = `${userId}/avatar-${Date.now()}.${extensao}`;

    try {

        // Converter imagem para ArrayBuffer
        const resposta = await fetch(imagem.uri);
        const arquivo = await resposta.arrayBuffer();

        // Enviar imagem ao Supabase Storage
        const { error: uploadError } = await supabase
            .storage
            .from('avatars')
            .upload(nomeArquivo, arquivo, {
                contentType: imagem.mimeType || 'image/jpeg',
                upsert: false
            });

        if (uploadError) {
            throw uploadError;
        }

        // Gerar URL pública
        const { data } = supabase
            .storage
            .from('avatars')
            .getPublicUrl(nomeArquivo);

        const avatarUrl = data.publicUrl;

        // Atualizar perfil no banco de dados
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                avatar_url: avatarUrl
            })
            .eq('id', userId);

        if (updateError) {

            // Remover imagem enviada caso a atualização falhe
            await supabase.storage
                .from('avatars')
                .remove([nomeArquivo]);

            throw updateError;
        }

        // Remover avatar anterior, se ele pertencer ao nosso bucket
        if (avatarAtual) {

            const marcador = '/storage/v1/object/public/avatars/';

            const indice = avatarAtual.indexOf(marcador);

            if (indice !== -1) {

                const caminhoAntigo = decodeURIComponent(
                    avatarAtual.substring(indice + marcador.length)
                );

                await supabase.storage
                    .from('avatars')
                    .remove([caminhoAntigo]);

            }

        }

        return avatarUrl;

    } catch (error) {

        console.log('Erro ao atualizar avatar:', error);

        throw error;

    }

}