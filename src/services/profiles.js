import { supabase } from './supabase';


// Buscar perfil de um usuário
export async function buscarPerfil(userId) {

    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id,
            username,
            full_name,
            avatar_url,
            bio
        `)
        .eq('id', userId)
        .single();

    if (error) {
        throw error;
    }

    return data;
}


// Pesquisar usuários por nome ou username
export async function pesquisarUsuarios(termo) {

    const busca = termo.trim();

    if (!busca) {
        return [];
    }

    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id,
            username,
            full_name,
            avatar_url,
            bio
        `)
        .or(`username.ilike.%${busca}%,full_name.ilike.%${busca}%`)
        .limit(20);

    if (error) {
        throw error;
    }

    return data || [];
}


// Buscar publicações de um usuário
export async function buscarPublicacoesUsuario(userId) {

    const { data, error } = await supabase
        .from('posts')
        .select(`
            id,
            content,
            image_url,
            created_at,
            user_id,
            likes (
                user_id
            ),
            comments (
                id
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        throw error;
    }

    return data;
}


// Atualizar perfil
export async function atualizarPerfil(userId, dados) {

    const { data, error } = await supabase
        .from('profiles')
        .update({
            username: dados.username.trim().toLowerCase(),
            full_name: dados.full_name.trim(),
            bio: dados.bio.trim()
        })
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

// Buscar sugestões de pessoas para explorar
export async function buscarSugestoesUsuarios() {

    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
        throw new Error('Você precisa estar conectado.');
    }

    // Buscar pessoas que o usuário já segue
    const { data: seguindo, error: seguindoError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

    if (seguindoError) throw seguindoError;

    const idsSeguidos = (seguindo || []).map(
        item => item.following_id
    );

    // Buscar perfis que ainda não são seguidos
    let consulta = supabase
        .from('profiles')
        .select(`
            id,
            username,
            full_name,
            avatar_url,
            bio
        `)
        .neq('id', user.id);

    if (idsSeguidos.length > 0) {
        consulta = consulta.not(
            'id',
            'in',
            `(${idsSeguidos.join(',')})`
        );
    }

    const { data, error } = await consulta.limit(10);

    if (error) throw error;

    return data || [];
}