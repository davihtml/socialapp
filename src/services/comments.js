import { supabase } from './supabase';

import {
    buscarIdsUsuariosBloqueados,
    verificarBloqueioMutuo
} from './blocks';


// Buscar comentários de uma publicação
export async function buscarComentarios(postId) {

    const idsBloqueados = await buscarIdsUsuariosBloqueados();

    let consulta = supabase
        .from('comments')
        .select(`
            id,
            content,
            created_at,
            user_id,
            profiles (
                username,
                full_name,
                avatar_url
            )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    // Ocultar comentários de usuários bloqueados
    if (idsBloqueados.length > 0) {

        consulta = consulta.not(
            'user_id',
            'in',
            `(${idsBloqueados.join(',')})`
        );

    }

    const { data, error } = await consulta;

    if (error) {
        throw error;
    }

    return data;
}


// Criar comentário
export async function criarComentario(postId, content) {

    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError) {
        throw userError;
    }

    if (!user) {
        throw new Error('Você precisa estar conectado.');
    }

    if (!content.trim()) {
        throw new Error('O comentário não pode estar vazio.');
    }

    // Buscar proprietário da publicação
    const { data: publicacao, error: postError } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();

    if (postError) {
        throw postError;
    }

    // Verificar bloqueio com o proprietário da publicação
    const bloqueado = await verificarBloqueioMutuo(
        publicacao.user_id
    );

    if (bloqueado) {
        throw new Error(
            'Não é possível comentar nesta publicação devido a um bloqueio.'
        );
    }

    // Criar comentário
    const { data, error } = await supabase
        .from('comments')
        .insert({
            post_id: postId,
            user_id: user.id,
            content: content.trim()
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    // Criar notificação, exceto para comentários na própria publicação
    if (publicacao.user_id !== user.id) {

        const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
                recipient_id: publicacao.user_id,
                sender_id: user.id,
                type: 'comment',
                post_id: postId,
                message: 'comentou na sua publicação.'
            });

        if (notificationError) {
            console.error(
                'Erro ao criar notificação de comentário:',
                notificationError
            );
        }

    }

    return data;
}


// Excluir comentário
export async function excluirComentario(commentId) {

    const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

    if (error) {
        throw error;
    }

}