import { supabase } from './supabase';


// Buscar usuário autenticado
async function buscarUsuarioAtual() {

    const {
        data: { user },
        error
    } = await supabase.auth.getUser();

    if (error) throw error;

    if (!user) {
        throw new Error('Você precisa estar conectado.');
    }

    return user;

}


// Buscar IDs de usuários envolvidos em bloqueios
// Inclui quem você bloqueou e quem bloqueou você
export async function buscarIdsUsuariosBloqueados() {

    const user = await buscarUsuarioAtual();

    const { data, error } = await supabase
        .from('user_blocks')
        .select('blocker_id, blocked_id')
        .or(
            `blocker_id.eq.${user.id},blocked_id.eq.${user.id}`
        );

    if (error) throw error;

    const ids = (data || []).map(item => {

        return item.blocker_id === user.id
            ? item.blocked_id
            : item.blocker_id;

    });

    return [...new Set(ids)];

}


// Verificar se existe bloqueio entre dois usuários
export async function verificarBloqueioMutuo(userId) {

    const user = await buscarUsuarioAtual();

    if (!userId || userId === user.id) {
        return false;
    }

    const idsBloqueados = await buscarIdsUsuariosBloqueados();

    return idsBloqueados.includes(userId);

}


// Bloquear usuário
export async function bloquearUsuario(userId) {

    const user = await buscarUsuarioAtual();

    if (!userId || userId === user.id) {
        throw new Error('Não é possível bloquear este usuário.');
    }

    const { error } = await supabase
        .from('user_blocks')
        .insert({
            blocker_id: user.id,
            blocked_id: userId
        });

    if (error) throw error;

    return true;

}


// Desbloquear usuário
export async function desbloquearUsuario(userId) {

    const user = await buscarUsuarioAtual();

    const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId);

    if (error) throw error;

    return true;

}


// Verificar se o usuário atual bloqueou outro perfil
export async function verificarSeBloqueou(userId) {

    const user = await buscarUsuarioAtual();

    const { data, error } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .maybeSingle();

    if (error) throw error;

    return !!data;

}


// Buscar usuários bloqueados pelo usuário atual
export async function buscarUsuariosBloqueados() {

    const user = await buscarUsuarioAtual();

    const { data, error } = await supabase
        .from('user_blocks')
        .select(`
            id,
            blocked_id,
            created_at,
            profiles:blocked_id (
                id,
                username,
                full_name,
                avatar_url
            )
        `)
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];

}


// Denunciar usuário
export async function denunciarUsuario(
    userId,
    motivo,
    detalhes = null
) {

    const user = await buscarUsuarioAtual();

    if (!userId || userId === user.id) {
        throw new Error('Não é possível denunciar este usuário.');
    }

    if (!motivo) {
        throw new Error('Selecione um motivo para a denúncia.');
    }

    const { error } = await supabase
        .from('reports')
        .insert({
            reporter_id: user.id,
            reported_user_id: userId,
            reason: motivo,
            details: detalhes
        });

    if (error) throw error;

    return true;

}


// Denunciar publicação
export async function denunciarPublicacao(
    postId,
    motivo,
    detalhes = null
) {

    const user = await buscarUsuarioAtual();

    if (!postId) {
        throw new Error('Publicação inválida.');
    }

    if (!motivo) {
        throw new Error('Selecione um motivo para a denúncia.');
    }

    const { error } = await supabase
        .from('reports')
        .insert({
            reporter_id: user.id,
            post_id: postId,
            reason: motivo,
            details: detalhes
        });

    if (error) throw error;

    return true;

}