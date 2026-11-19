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
            edited_at,
            user_id,
            parent_id,
            profiles (
                username,
                full_name,
                avatar_url
            ),
            comment_likes (
                user_id
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

    if (error) throw error;

    return data;
}


// Criar comentário ou resposta
export async function criarComentario(postId, content, parentId = null) {

    const { data: { user }, error: userError } =
        await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error('Você precisa estar conectado.');

    if (!content.trim()) {
        throw new Error('O comentário não pode estar vazio.');
    }

    // Buscar proprietário da publicação
    const { data: publicacao, error: postError } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();

    if (postError) throw postError;

    // Verificar bloqueio com o proprietário da publicação
    const bloqueioPublicacao = await verificarBloqueioMutuo(
        publicacao.user_id
    );

    if (bloqueioPublicacao) {
        throw new Error(
            'Não é possível comentar nesta publicação devido a um bloqueio.'
        );
    }

    let destinatarioNotificacao = publicacao.user_id;

    // Se for uma resposta, verificar o comentário original
    if (parentId) {

        const { data: comentarioPai, error: parentError } = await supabase
            .from('comments')
            .select('id, user_id, post_id')
            .eq('id', parentId)
            .single();

        if (parentError) throw parentError;

        if (comentarioPai.post_id !== postId) {
            throw new Error('Comentário de origem inválido.');
        }

        // Verificar bloqueio com o autor do comentário respondido
        const bloqueioAutor = await verificarBloqueioMutuo(
            comentarioPai.user_id
        );

        if (bloqueioAutor) {
            throw new Error(
                'Não é possível responder a este comentário devido a um bloqueio.'
            );
        }

        destinatarioNotificacao = comentarioPai.user_id;
    }

    // Criar comentário ou resposta
    const { data, error } = await supabase
        .from('comments')
        .insert({
            post_id: postId,
            user_id: user.id,
            content: content.trim(),
            parent_id: parentId
        })
        .select()
        .single();

    if (error) throw error;

    // Criar notificação
    if (destinatarioNotificacao !== user.id) {

        const mensagem = parentId
            ? 'respondeu ao seu comentário.'
            : 'comentou na sua publicação.';

        const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
                recipient_id: destinatarioNotificacao,
                sender_id: user.id,
                type: 'comment',
                post_id: postId,
                message: mensagem
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


// Curtir ou descurtir comentário
export async function alternarCurtidaComentario(commentId, jaCurtiu) {

    const { data: { user }, error: userError } =
        await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error('Você precisa estar conectado.');

    // Buscar autor do comentário
    const { data: comentario, error: commentError } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', commentId)
        .single();

    if (commentError) throw commentError;

    // Verificar bloqueio entre os usuários
    const bloqueado = await verificarBloqueioMutuo(
        comentario.user_id
    );

    if (bloqueado) {
        throw new Error(
            'Não é possível curtir este comentário devido a um bloqueio.'
        );
    }

    if (jaCurtiu) {

        const { error } = await supabase
            .from('comment_likes')
            .delete()
            .eq('comment_id', commentId)
            .eq('user_id', user.id);

        if (error) throw error;

        return false;

    }

    const { error } = await supabase
        .from('comment_likes')
        .insert({
            comment_id: commentId,
            user_id: user.id
        });

    if (error) throw error;

    return true;
}


// Editar comentário ou resposta
export async function editarComentario(commentId, novoConteudo) {

    const { data: { user }, error: userError } =
        await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
        throw new Error('Você precisa estar conectado.');
    }

    if (!novoConteudo.trim()) {
        throw new Error('O comentário não pode estar vazio.');
    }

    const { data, error } = await supabase
        .from('comments')
        .update({
            content: novoConteudo.trim(),
            edited_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) throw error;

    return data;
}


// Excluir comentário
export async function excluirComentario(commentId) {

    const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

    if (error) throw error;
}