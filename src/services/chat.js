import { supabase } from './supabase';

import {
    verificarBloqueioMutuo
} from './blocks';


// =====================================
// BUSCAR USUÁRIO AUTENTICADO
// =====================================

async function buscarUsuarioAtual() {

    const {
        data: { user },
        error
    } = await supabase.auth.getUser();

    if (error) {
        throw error;
    }

    if (!user) {
        throw new Error('Você precisa estar conectado.');
    }

    return user;
}


// =====================================
// VERIFICAR SE A CONVERSA ESTÁ PERMITIDA
// =====================================

async function verificarConversaPermitida(conversationId) {

    const user = await buscarUsuarioAtual();

    const { data: conversa, error } = await supabase
        .from('conversations')
        .select('user1_id, user2_id')
        .eq('id', conversationId)
        .single();

    if (error) {
        throw error;
    }

    if (
        conversa.user1_id !== user.id &&
        conversa.user2_id !== user.id
    ) {
        throw new Error('Você não tem acesso a esta conversa.');
    }

    const outroUsuarioId =
        conversa.user1_id === user.id
            ? conversa.user2_id
            : conversa.user1_id;

    const bloqueado = await verificarBloqueioMutuo(outroUsuarioId);

    if (bloqueado) {
        throw new Error(
            'Esta conversa está indisponível devido a um bloqueio.'
        );
    }

    return {
        user,
        conversa,
        outroUsuarioId
    };
}


// =====================================
// BUSCAR OU CRIAR CONVERSA
// =====================================

export async function buscarOuCriarConversa(outroUsuarioId) {

    const user = await buscarUsuarioAtual();

    if (!outroUsuarioId || outroUsuarioId === user.id) {
        throw new Error('Usuário inválido.');
    }

    // Verificar bloqueio em qualquer direção
    const bloqueado = await verificarBloqueioMutuo(outroUsuarioId);

    if (bloqueado) {
        throw new Error(
            'Não é possível iniciar uma conversa com este usuário.'
        );
    }

    const [user1_id, user2_id] = [user.id, outroUsuarioId].sort();

    const { data: conversaExistente, error: buscaError } =
        await supabase
            .from('conversations')
            .select('*')
            .eq('user1_id', user1_id)
            .eq('user2_id', user2_id)
            .maybeSingle();

    if (buscaError) {
        throw buscaError;
    }

    if (conversaExistente) {
        return conversaExistente;
    }

    const { data, error } = await supabase
        .from('conversations')
        .insert({
            user1_id,
            user2_id,
            created_by: user.id
        })
        .select()
        .single();

    if (error) {

        if (error.code === '23505') {

            const { data: conversa, error: novoErro } = await supabase
                .from('conversations')
                .select('*')
                .eq('user1_id', user1_id)
                .eq('user2_id', user2_id)
                .single();

            if (novoErro) {
                throw novoErro;
            }

            return conversa;
        }

        throw error;
    }

    return data;
}


// =====================================
// BUSCAR CONVERSAS DO USUÁRIO
// =====================================

export async function buscarConversas() {

    const user = await buscarUsuarioAtual();

    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

    if (error) {
        throw error;
    }

    // Remover conversas com usuários bloqueados
    const conversasPermitidas = await Promise.all(

        (data || []).map(async (conversa) => {

            const outroUsuarioId =
                conversa.user1_id === user.id
                    ? conversa.user2_id
                    : conversa.user1_id;

            const bloqueado = await verificarBloqueioMutuo(
                outroUsuarioId
            );

            return bloqueado ? null : conversa;

        })

    );

    return conversasPermitidas.filter(Boolean);
}


// =====================================
// BUSCAR MENSAGENS
// =====================================

export async function buscarMensagens(conversationId) {

    await verificarConversaPermitida(conversationId);

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) {
        throw error;
    }

    return data;
}


// =====================================
// ENVIAR MENSAGEM
// =====================================

export async function enviarMensagem(conversationId, content) {

    const { user, outroUsuarioId } =
        await verificarConversaPermitida(conversationId);

    if (!content.trim()) {
        return null;
    }

    // Enviar mensagem
    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: content.trim()
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    // Criar notificação para o destinatário
    try {

        if (outroUsuarioId) {

            const { error: notificationError } = await supabase
                .from('notifications')
                .insert({
                    recipient_id: outroUsuarioId,
                    sender_id: user.id,
                    type: 'message',
                    message: 'enviou uma mensagem.'
                });

            if (notificationError) {
                throw notificationError;
            }

        }

    } catch (notificationError) {

        console.log(
            'Erro ao criar notificação de mensagem:',
            notificationError
        );

    }

    return data;
}


// =====================================
// ESCUTAR MENSAGENS EM TEMPO REAL
// =====================================

export function ouvirMensagens(conversationId, callback) {

    const canal = supabase
        .channel(`chat-${conversationId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`
            },
            async (payload) => {

                try {

                    await verificarConversaPermitida(conversationId);

                    callback(payload.new);

                } catch (error) {

                    console.log(
                        'Mensagem recebida de conversa bloqueada:',
                        error.message
                    );

                }

            }
        )
        .subscribe();

    return canal;
}


// =====================================
// PARAR DE ESCUTAR MENSAGENS
// =====================================

export async function pararDeOuvirMensagens(canal) {

    if (!canal) {
        return;
    }

    await supabase.removeChannel(canal);

}


// =====================================
// MARCAR MENSAGENS COMO LIDAS
// =====================================

export async function marcarMensagensComoLidas(conversationId) {

    await verificarConversaPermitida(conversationId);

    const { error } = await supabase.rpc(
        'marcar_mensagens_como_lidas',
        {
            p_conversation_id: conversationId
        }
    );

    if (error) {
        throw error;
    }

}


// =====================================
// CONTAR MENSAGENS NÃO LIDAS
// =====================================

export async function contarMensagensNaoLidas(conversationId) {

    const { user } = await verificarConversaPermitida(conversationId);

    const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null);

    if (error) {
        throw error;
    }

    return count || 0;

}