import { supabase } from './supabase';


// Buscar notificações do usuário
export async function buscarNotificacoes() {

    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
        throw new Error('Você precisa estar conectado.');
    }

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
}


// Contar notificações não lidas
export async function contarNotificacoesNaoLidas() {

    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
        throw new Error('Você precisa estar conectado.');
    }

    const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('recipient_id', user.id)
        .eq('is_read', false);

    if (error) throw error;

    return data?.length || 0;
}


// Marcar uma notificação como lida
export async function marcarNotificacaoComoLida(notificationId) {

    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
        throw new Error('Você precisa estar conectado.');
    }

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('recipient_id', user.id);

    if (error) throw error;

    return true;
}


// Marcar todas as notificações como lidas
export async function marcarTodasComoLidas() {

    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
        throw new Error('Você precisa estar conectado.');
    }

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

    if (error) throw error;

    return true;
}


// Registrar visita ao perfil
export async function registrarVisitaPerfil(perfilVisitadoId) {

    if (!perfilVisitadoId) {
        return false;
    }

    const { data, error } = await supabase.rpc(
        'registrar_visita_perfil',
        {
            perfil_visitado: perfilVisitadoId
        }
    );

    if (error) {
        console.log('Erro ao registrar visita:', error);
        throw error;
    }

    return data;
}