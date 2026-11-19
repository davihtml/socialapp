import { supabase } from './supabase';

import {
    verificarBloqueioMutuo
} from './blocks';


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


// Verificar se o usuário atual segue outro usuário
export async function verificarSeSegue(userId) {

    console.log('FOLLOWS: verificando relacionamento...');

    const user = await buscarUsuarioAtual();

    const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .limit(1);

    if (error) throw error;

    return !!(data && data.length > 0);
}


// Seguir usuário
export async function seguirUsuario(userId) {

    console.log('FOLLOWS: iniciando ação de seguir...');

    const user = await buscarUsuarioAtual();

    if (user.id === userId) {
        throw new Error('Você não pode seguir a si mesmo.');
    }

    // Verificar se existe bloqueio em qualquer direção
    const bloqueio = await verificarBloqueioMutuo(userId);

    if (bloqueio) {
        throw new Error(
            'Não é possível seguir este usuário devido a um bloqueio.'
        );
    }

    // Registrar relacionamento
    const { error } = await supabase
        .from('follows')
        .insert({
            follower_id: user.id,
            following_id: userId
        });

    if (error) throw error;

    console.log('FOLLOWS: relacionamento criado.');

    // Criar notificação
    const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
            recipient_id: userId,
            sender_id: user.id,
            type: 'follow',
            message: 'começou a seguir você.'
        });

    if (notificationError) {
        console.log(
            'Erro ao criar notificação de seguidor:',
            notificationError
        );
    }

    return true;
}


// Deixar de seguir usuário
export async function deixarDeSeguirUsuario(userId) {

    console.log('FOLLOWS: deixando de seguir...');

    const user = await buscarUsuarioAtual();

    const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

    if (error) throw error;

    return true;
}


// Buscar estatísticas de seguidores
export async function buscarEstatisticasSeguidores(userId) {

    console.log('FOLLOWS: buscando seguidores...');

    const { data: seguidores, error: seguidoresError } = await supabase
        .from('follows')
        .select('id')
        .eq('following_id', userId);

    if (seguidoresError) throw seguidoresError;


    console.log('FOLLOWS: buscando seguindo...');

    const { data: seguindo, error: seguindoError } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', userId);

    if (seguindoError) throw seguindoError;


    return {
        seguidores: seguidores?.length || 0,
        seguindo: seguindo?.length || 0
    };

}