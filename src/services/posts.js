import { supabase } from './supabase';

import {
    excluirImagemPublicacao
} from './postImages';

import {
    buscarIdsUsuariosBloqueados,
    verificarBloqueioMutuo
} from './blocks';


// Aplicar filtro de usuários bloqueados na consulta
function aplicarFiltroBloqueados(consulta, idsBloqueados) {

    if (idsBloqueados.length === 0) {
        return consulta;
    }

    const ids = `(${idsBloqueados.join(',')})`;

    return consulta.not('user_id', 'in', ids);

}


// Buscar publicações
export async function buscarPublicacoes() {

    const idsBloqueados = await buscarIdsUsuariosBloqueados();

    let consulta = supabase
        .from('posts')
        .select(`
            id,
            content,
            image_url,
            created_at,
            user_id,

            profiles (
                username,
                full_name,
                avatar_url
            ),

            likes (
                user_id
            ),

            comments (
                id
            )
        `)
        .order('created_at', { ascending: false });

    consulta = aplicarFiltroBloqueados(
        consulta,
        idsBloqueados
    );

    const { data, error } = await consulta;

    if (error) {
        throw error;
    }

    return data;
}


// Buscar publicações paginadas
export async function buscarPublicacoesPaginadas(
    limite = 10,
    pagina = 0
) {

    const inicio = pagina * limite;
    const fim = inicio + limite - 1;

    const idsBloqueados = await buscarIdsUsuariosBloqueados();

    let consulta = supabase
        .from('posts')
        .select(`
            id,
            content,
            image_url,
            created_at,
            user_id,

            profiles (
                username,
                full_name,
                avatar_url
            ),

            likes (
                user_id
            ),

            comments (
                id
            )
        `)
        .order('created_at', { ascending: false });

    consulta = aplicarFiltroBloqueados(
        consulta,
        idsBloqueados
    );

    const { data, error } = await consulta
        .range(inicio, fim);

    if (error) {
        throw error;
    }

    return data;
}


// Buscar uma publicação específica pelo ID
export async function buscarPublicacaoPorId(postId) {

    const idsBloqueados = await buscarIdsUsuariosBloqueados();

    let consulta = supabase
        .from('posts')
        .select(`
            id,
            content,
            image_url,
            created_at,
            user_id,

            profiles (
                username,
                full_name,
                avatar_url
            ),

            likes (
                user_id
            ),

            comments (
                id
            )
        `)
        .eq('id', postId);

    consulta = aplicarFiltroBloqueados(
        consulta,
        idsBloqueados
    );

    const { data, error } = await consulta.maybeSingle();

    if (error) {
        throw error;
    }

    return data;

}


// Buscar publicações salvas pelo usuário
export async function buscarPublicacoesSalvas() {

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

    const idsBloqueados = await buscarIdsUsuariosBloqueados();

    const { data, error } = await supabase
        .from('saved_posts')
        .select(`
            created_at,

            posts (
                id,
                content,
                image_url,
                created_at,
                user_id,

                profiles (
                    username,
                    full_name,
                    avatar_url
                ),

                likes (
                    user_id
                ),

                comments (
                    id
                )
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        throw error;
    }

    return (data || [])
        .filter(item => {

            if (!item.posts) {
                return false;
            }

            return !idsBloqueados.includes(item.posts.user_id);

        })
        .map(item => ({
            ...item.posts,
            saved_at: item.created_at
        }));

}


// Verificar se uma publicação está salva
export async function verificarPublicacaoSalva(postId) {

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

    const { data, error } = await supabase
        .from('saved_posts')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .limit(1);

    if (error) {
        throw error;
    }

    return !!(data && data.length > 0);

}


// Salvar ou remover uma publicação dos favoritos
export async function alternarPublicacaoSalva(postId, jaEstaSalva) {

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

    if (jaEstaSalva) {

        const { error } = await supabase
            .from('saved_posts')
            .delete()
            .eq('user_id', user.id)
            .eq('post_id', postId);

        if (error) {
            throw error;
        }

        return false;

    } else {

        const { error } = await supabase
            .from('saved_posts')
            .insert({
                user_id: user.id,
                post_id: postId
            });

        if (error) {
            throw error;
        }

        return true;

    }

}


// Criar publicação
export async function criarPublicacao(content, imageUrl = null) {

    const { data: { user }, error: userError } =
        await supabase.auth.getUser();

    if (userError) {
        throw userError;
    }

    if (!user) {
        throw new Error('Você precisa estar conectado para publicar.');
    }

    const { data, error } = await supabase
        .from('posts')
        .insert({
            user_id: user.id,
            content: content.trim(),
            image_url: imageUrl
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}


// Excluir publicação
export async function excluirPublicacao(postId) {

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

    // Buscar a publicação e verificar seu proprietário
    const { data: publicacao, error: buscaError } = await supabase
        .from('posts')
        .select('id, image_url')
        .eq('id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (buscaError) {
        throw buscaError;
    }

    if (!publicacao) {
        throw new Error('Publicação não encontrada ou sem permissão.');
    }

    // Excluir a publicação
    const { error: exclusaoError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);

    if (exclusaoError) {
        throw exclusaoError;
    }

    // Excluir a imagem, caso exista
    if (publicacao.image_url) {

        try {

            await excluirImagemPublicacao(publicacao.image_url);

        } catch (error) {

            console.log(
                'Não foi possível excluir a imagem:',
                error
            );

        }

    }

    return true;
}


// Curtir ou descurtir uma publicação
export async function alternarCurtida(postId, jaCurtiu) {

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

    if (jaCurtiu) {

        const { error } = await supabase
            .from('likes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', user.id);

        if (error) {
            throw error;
        }

        return false;

    } else {

        // Buscar o proprietário da publicação
        const { data: publicacao, error: postError } = await supabase
            .from('posts')
            .select('user_id')
            .eq('id', postId)
            .single();

        if (postError) {
            throw postError;
        }

        // Verificar bloqueio em qualquer direção
        const bloqueado = await verificarBloqueioMutuo(
            publicacao.user_id
        );

        if (bloqueado) {
            throw new Error(
                'Não é possível curtir esta publicação devido a um bloqueio.'
            );
        }

        // Registrar a curtida
        const { error } = await supabase
            .from('likes')
            .insert({
                post_id: postId,
                user_id: user.id
            });

        if (error) {
            throw error;
        }

        // Criar notificação, exceto quando o usuário curtir a própria publicação
        if (publicacao.user_id !== user.id) {

            const { error: notificationError } = await supabase
                .from('notifications')
                .insert({
                    recipient_id: publicacao.user_id,
                    sender_id: user.id,
                    type: 'like',
                    post_id: postId,
                    message: 'curtiu sua publicação.'
                });

            if (notificationError) {
                console.error(
                    'Erro ao criar notificação de curtida:',
                    notificationError
                );
            }

        }

        return true;

    }

}


// Buscar publicações paginadas para a área Explorar
export async function buscarPublicacoesExplorar(
    limite = 30,
    pagina = 0
) {

    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
        throw new Error('Você precisa estar conectado.');
    }

    const inicio = pagina * limite;
    const fim = inicio + limite - 1;

    const idsBloqueados = await buscarIdsUsuariosBloqueados();

    let consulta = supabase
        .from('posts')
        .select(`
            id,
            content,
            image_url,
            created_at,
            user_id,

            profiles (
                username,
                full_name,
                avatar_url
            ),

            likes (
                user_id
            ),

            comments (
                id
            )
        `)
        .neq('user_id', user.id)
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false });

    consulta = aplicarFiltroBloqueados(
        consulta,
        idsBloqueados
    );

    const { data, error } = await consulta
        .range(inicio, fim);

    if (error) throw error;

    return data || [];
}