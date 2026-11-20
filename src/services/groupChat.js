import { supabase } from './supabase';


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
// VERIFICAR PARTICIPAÇÃO NO GRUPO
// =====================================

async function verificarParticipacao(groupId) {

    const user = await buscarUsuarioAtual();

    const { data, error } = await supabase
        .from('chat_group_members')
        .select('id, role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error('Você não participa deste grupo.');
    }

    return {
        user,
        membership: data
    };
}


// =====================================
// CRIAR GRUPO
// =====================================

export async function criarGrupo(name, description = '', avatar_url = null) {

    const user = await buscarUsuarioAtual();

    // Verificar sessão
    const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

    const session = sessionData?.session;
    const token = session?.access_token;

    console.log('[GRUPO] Verificação da sessão:', {
        userId: user.id,
        sessionUserId: session?.user?.id,
        sessionExiste: !!session,
        accessTokenExiste: !!token,
        sessionError
    });

    // Verificar informações do JWT
    if (token) {

        try {

            const payloadBase64 = token
                .split('.')[1]
                .replace(/-/g, '+')
                .replace(/_/g, '/');

            const payload = JSON.parse(
                atob(
                    payloadBase64.padEnd(
                        Math.ceil(payloadBase64.length / 4) * 4,
                        '='
                    )
                )
            );

            console.log('[GRUPO] JWT:', {
                sub: payload.sub,
                role: payload.role,
                aud: payload.aud
            });

        } catch (error) {

            console.log(
                '[GRUPO] Erro ao interpretar JWT:',
                error.message
            );

        }
    }

    // Validar nome
    if (!name || !name.trim()) {
        throw new Error('Informe o nome do grupo.');
    }

    const descricao = description
        ? description.trim()
        : '';

    console.log('[GRUPO] Dados enviados:', {
        name: name.trim(),
        description: descricao,
        avatar_url,
        created_by: user.id
    });

    // Criar grupo
    const { data: grupo, error } = await supabase
        .from('chat_groups')
        .insert({
            name: name.trim(),
            description: descricao,
            avatar_url,
            created_by: user.id
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    // Adicionar criador como administrador
    const { error: memberError } = await supabase
        .from('chat_group_members')
        .insert({
            group_id: grupo.id,
            user_id: user.id,
            role: 'admin'
        });

    if (memberError) {
        throw memberError;
    }

    return grupo;
}


// =====================================
// BUSCAR GRUPOS DO USUÁRIO
// =====================================

export async function buscarGrupos() {

    const user = await buscarUsuarioAtual();

    const { data: participacoes, error } = await supabase
        .from('chat_group_members')
        .select('group_id')
        .eq('user_id', user.id);

    if (error) {
        throw error;
    }

    const groupIds = (participacoes || []).map(
        item => item.group_id
    );

    if (groupIds.length === 0) {
        return [];
    }

    const { data, error: groupError } = await supabase
        .from('chat_groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false });

    if (groupError) {
        throw groupError;
    }

    return data || [];
}


// =====================================
// BUSCAR GRUPO
// =====================================

export async function buscarGrupo(groupId) {

    await verificarParticipacao(groupId);

    const { data, error } = await supabase
        .from('chat_groups')
        .select('*')
        .eq('id', groupId)
        .single();

    if (error) {
        throw error;
    }

    return data;
}


// =====================================
// ATUALIZAR INFORMAÇÕES DO GRUPO
// =====================================

export async function atualizarGrupo(
    groupId,
    updates
) {

    const { membership } = await verificarParticipacao(groupId);

    if (membership.role !== 'admin') {
        throw new Error('Apenas administradores podem editar o grupo.');
    }

    const dados = {};

    if (updates.name !== undefined) {

        if (!updates.name.trim()) {
            throw new Error('O nome do grupo não pode ficar vazio.');
        }

        dados.name = updates.name.trim();
    }

    if (updates.description !== undefined) {
        dados.description = updates.description.trim();
    }

    if (updates.avatar_url !== undefined) {
        dados.avatar_url = updates.avatar_url;
    }

    const { data, error } = await supabase
        .from('chat_groups')
        .update(dados)
        .eq('id', groupId)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}


// =====================================
// BUSCAR PARTICIPANTES
// =====================================

export async function buscarParticipantes(groupId) {

    await verificarParticipacao(groupId);

    const { data, error } = await supabase
        .from('chat_group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

    if (error) {
        throw error;
    }

    return data || [];
}


// =====================================
// ADICIONAR PARTICIPANTE
// =====================================

export async function adicionarParticipante(
    groupId,
    userId
) {

    const { membership } = await verificarParticipacao(groupId);

    if (membership.role !== 'admin') {
        throw new Error('Apenas administradores podem adicionar participantes.');
    }

    if (!userId) {
        throw new Error('Usuário inválido.');
    }

    const { data, error } = await supabase
        .from('chat_group_members')
        .insert({
            group_id: groupId,
            user_id: userId,
            role: 'member'
        })
        .select()
        .single();

    if (error) {

        if (error.code === '23505') {
            throw new Error('Este usuário já participa do grupo.');
        }

        throw error;
    }

    return data;
}


// =====================================
// REMOVER PARTICIPANTE
// =====================================

export async function removerParticipante(
    groupId,
    userId
) {

    const { membership } = await verificarParticipacao(groupId);

    if (membership.role !== 'admin') {
        throw new Error('Apenas administradores podem remover participantes.');
    }

    if (!userId) {
        throw new Error('Usuário inválido.');
    }

    const { error } = await supabase
        .from('chat_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

    if (error) {
        throw error;
    }
}


// =====================================
// SAIR DO GRUPO
// =====================================

export async function sairDoGrupo(groupId) {

    const user = await buscarUsuarioAtual();

    const { error } = await supabase
        .from('chat_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

    if (error) {
        throw error;
    }
}


// =====================================
// EXCLUIR GRUPO
// =====================================

export async function excluirGrupo(groupId) {

    const { membership } = await verificarParticipacao(groupId);

    if (membership.role !== 'admin') {
        throw new Error('Apenas administradores podem excluir o grupo.');
    }

    const { error } = await supabase
        .from('chat_groups')
        .delete()
        .eq('id', groupId);

    if (error) {
        throw error;
    }
}


// =====================================
// BUSCAR MENSAGENS DO GRUPO
// =====================================

export async function buscarMensagensGrupo(groupId) {

    await verificarParticipacao(groupId);

    const { data, error } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

    if (error) {
        throw error;
    }

    return data || [];
}


// =====================================
// ENVIAR MENSAGEM NO GRUPO
// =====================================

export async function enviarMensagemGrupo(
    groupId,
    content
) {

    const { user } = await verificarParticipacao(groupId);

    if (!content || !content.trim()) {
        return null;
    }

    const { data, error } = await supabase
        .from('group_messages')
        .insert({
            group_id: groupId,
            sender_id: user.id,
            content: content.trim()
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}


// =====================================
// ESCUTAR MENSAGENS EM TEMPO REAL
// =====================================

export function ouvirMensagensGrupo(groupId, callback) {

    const canal = supabase
        .channel(`group-chat-${groupId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'group_messages',
                filter: `group_id=eq.${groupId}`
            },
            async (payload) => {

                try {

                    await verificarParticipacao(groupId);

                    callback(payload.new);

                } catch (error) {

                    console.log(
                        'Erro ao receber mensagem do grupo:',
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

export async function pararDeOuvirMensagensGrupo(canal) {

    if (!canal) {
        return;
    }

    await supabase.removeChannel(canal);
}