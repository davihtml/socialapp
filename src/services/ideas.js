import { supabase } from './supabase';

import {
    buscarIdsUsuariosBloqueados,
    verificarBloqueioMutuo
} from './blocks';


// =========================================
// FUNÇÕES AUXILIARES
// =========================================


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


// Aplicar filtro de usuários bloqueados
function aplicarFiltroBloqueados(consulta, idsBloqueados) {

    if (!idsBloqueados.length) {
        return consulta;
    }

    const ids = `(${idsBloqueados.join(',')})`;

    return consulta.not('user_id', 'in', ids);

}


// Buscar ideia e verificar bloqueio com seu criador
async function verificarAcessoIdeia(ideaId) {

    const { data: ideia, error } = await supabase
        .from('ideas')
        .select('id, user_id')
        .eq('id', ideaId)
        .maybeSingle();

    if (error) throw error;

    if (!ideia) {
        throw new Error('Ideia não encontrada.');
    }

    const bloqueado = await verificarBloqueioMutuo(
        ideia.user_id
    );

    if (bloqueado) {
        throw new Error(
            'Não é possível interagir com esta ideia devido a um bloqueio.'
        );
    }

    return ideia;

}


// =========================================
// BUSCAR IDEIAS
// =========================================


// Buscar ideias com paginação
export async function buscarIdeias(
    limite = 20,
    pagina = 0
) {

    const inicio = pagina * limite;
    const fim = inicio + limite - 1;

    const idsBloqueados = await buscarIdsUsuariosBloqueados();

    let consulta = supabase
        .from('ideas')
        .select(`
            id,
            user_id,
            title,
            description,
            status,
            parent_idea_id,
            source_contribution_id,
            created_at,
            updated_at,

            profiles:profiles!ideas_user_id_profiles_fkey (
                username,
                full_name,
                avatar_url
            )
        `)
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


// Buscar uma ideia específica
export async function buscarIdeiaPorId(ideaId) {

    const idsBloqueados = await buscarIdsUsuariosBloqueados();

    let consulta = supabase
        .from('ideas')
        .select(`
            id,
            user_id,
            title,
            description,
            status,
            parent_idea_id,
            source_contribution_id,
            created_at,
            updated_at,

            profiles:profiles!ideas_user_id_profiles_fkey (
                username,
                full_name,
                avatar_url
            )
        `)
        .eq('id', ideaId);

    consulta = aplicarFiltroBloqueados(
        consulta,
        idsBloqueados
    );

    const { data, error } = await consulta.maybeSingle();

    if (error) throw error;

    return data;

}


// Buscar ideias criadas pelo usuário atual
export async function buscarMinhasIdeias() {

    const user = await buscarUsuarioAtual();

    const { data, error } = await supabase
        .from('ideas')
        .select(`
            id,
            user_id,
            title,
            description,
            status,
            parent_idea_id,
            source_contribution_id,
            created_at,
            updated_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];

}


// =========================================
// CRIAR E EDITAR IDEIAS
// =========================================


// Criar uma ideia
export async function criarIdeia(title, description) {

    const user = await buscarUsuarioAtual();

    const titulo = title?.trim();
    const descricao = description?.trim();

    if (!titulo || !descricao) {
        throw new Error(
            'Preencha o título e a descrição da ideia.'
        );
    }

    if (titulo.length > 120) {
        throw new Error(
            'O título deve ter no máximo 120 caracteres.'
        );
    }

    const { data, error } = await supabase
        .from('ideas')
        .insert({
            user_id: user.id,
            title: titulo,
            description: descricao
        })
        .select()
        .single();

    if (error) throw error;

    return data;

}


// Atualizar o status de uma ideia
export async function atualizarStatusIdeia(
    ideaId,
    status
) {

    const user = await buscarUsuarioAtual();

    const statusPermitidos = [
        'developing',
        'paused',
        'completed'
    ];

    if (!statusPermitidos.includes(status)) {
        throw new Error('Status inválido.');
    }

    const { data, error } = await supabase
        .from('ideas')
        .update({
            status,
            updated_at: new Date().toISOString()
        })
        .eq('id', ideaId)
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

    if (error) throw error;

    if (!data) {
        throw new Error(
            'Ideia não encontrada ou sem permissão.'
        );
    }

    return data;

}


// =========================================
// CONTRIBUIÇÕES
// =========================================


// Buscar contribuições de uma ideia
export async function buscarContribuicoes(ideaId) {

    await verificarAcessoIdeia(ideaId);

    const idsBloqueados = await buscarIdsUsuariosBloqueados();

    let consulta = supabase
        .from('idea_contributions')
        .select(`
            id,
            idea_id,
            user_id,
            parent_id,
            content,
            created_at,

            profiles:profiles!idea_contributions_user_id_profiles_fkey (
                username,
                full_name,
                avatar_url
            )
        `)
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true });

    consulta = aplicarFiltroBloqueados(
        consulta,
        idsBloqueados
    );

    const { data, error } = await consulta;

    if (error) throw error;

    return data || [];

}


// Criar contribuição ou resposta
export async function criarContribuicao(
    ideaId,
    content,
    parentId = null
) {

    const user = await buscarUsuarioAtual();

    const texto = content?.trim();

    if (!texto) {
        throw new Error(
            'Escreva algo antes de enviar sua contribuição.'
        );
    }

    await verificarAcessoIdeia(ideaId);

    if (parentId) {

        const { data: contribuicao, error } = await supabase
            .from('idea_contributions')
            .select('id, idea_id, user_id')
            .eq('id', parentId)
            .eq('idea_id', ideaId)
            .maybeSingle();

        if (error) throw error;

        if (!contribuicao) {
            throw new Error(
                'A contribuição respondida não foi encontrada.'
            );
        }

        const bloqueado = await verificarBloqueioMutuo(
            contribuicao.user_id
        );

        if (bloqueado) {
            throw new Error(
                'Não é possível responder a esta contribuição devido a um bloqueio.'
            );
        }

    }

    const { data, error } = await supabase
        .from('idea_contributions')
        .insert({
            idea_id: ideaId,
            user_id: user.id,
            parent_id: parentId,
            content: texto
        })
        .select()
        .single();

    if (error) throw error;

    return data;

}


// Buscar contribuições feitas pelo usuário atual
export async function buscarMinhasContribuicoes() {

    const user = await buscarUsuarioAtual();

    const { data, error } = await supabase
        .from('idea_contributions')
        .select(`
            id,
            idea_id,
            parent_id,
            content,
            created_at,

ideas:ideas!idea_contributions_idea_id_fkey (
    id,
    title,
    user_id
)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;

    const idsBloqueados = await buscarIdsUsuariosBloqueados();

    return (data || []).filter(item => {

        return item.ideas &&
            !idsBloqueados.includes(item.ideas.user_id);

    });

}


// =========================================
// RAMIFICAÇÕES
// =========================================


// Criar uma nova ideia a partir de uma contribuição
export async function criarRamificacao(
    contributionId,
    title,
    description
) {

    const user = await buscarUsuarioAtual();

    const titulo = title?.trim();
    const descricao = description?.trim();

    if (!titulo || !descricao) {
        throw new Error(
            'Preencha o título e a descrição da nova ideia.'
        );
    }

    if (titulo.length > 120) {
        throw new Error(
            'O título deve ter no máximo 120 caracteres.'
        );
    }

    const { data: contribuicao, error } = await supabase
        .from('idea_contributions')
        .select('id, idea_id, user_id')
        .eq('id', contributionId)
        .maybeSingle();

    if (error) throw error;

    if (!contribuicao) {
        throw new Error(
            'A contribuição de origem não foi encontrada.'
        );
    }

    await verificarAcessoIdeia(contribuicao.idea_id);

    const bloqueado = await verificarBloqueioMutuo(
        contribuicao.user_id
    );

    if (bloqueado) {
        throw new Error(
            'Não é possível utilizar esta contribuição devido a um bloqueio.'
        );
    }

    const { data, error: criacaoError } = await supabase
        .from('ideas')
        .insert({
            user_id: user.id,
            title: titulo,
            description: descricao,
            parent_idea_id: contribuicao.idea_id,
            source_contribution_id: contribuicao.id
        })
        .select()
        .single();

    if (criacaoError) throw criacaoError;

    return data;

}


// Buscar ideias derivadas de uma ideia original
export async function buscarRamificacoes(ideaId) {

    await verificarAcessoIdeia(ideaId);

    const idsBloqueados = await buscarIdsUsuariosBloqueados();

    let consulta = supabase
        .from('ideas')
        .select(`
            id,
            user_id,
            title,
            description,
            status,
            parent_idea_id,
            source_contribution_id,
            created_at,

            profiles:profiles!ideas_user_id_profiles_fkey (
                username,
                full_name,
                avatar_url
            )
        `)
        .eq('parent_idea_id', ideaId)
        .order('created_at', { ascending: false });

    consulta = aplicarFiltroBloqueados(
        consulta,
        idsBloqueados
    );

    const { data, error } = await consulta;

    if (error) throw error;

    return data || [];

}


// =========================================
// COLABORADORES
// =========================================


// Buscar colaboradores de uma ideia
export async function buscarColaboradores(ideaId) {

    await verificarAcessoIdeia(ideaId);

    const { data, error } = await supabase
        .from('idea_collaborators')
        .select(`
            id,
            idea_id,
            user_id,
            role,
            created_at,

            profiles:profiles!idea_collaborators_user_id_profiles_fkey (
                username,
                full_name,
                avatar_url
            )
        `)
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true });

    if (error) throw error;

    return data || [];

}


// Adicionar colaborador
export async function adicionarColaborador(
    ideaId,
    collaboratorId
) {

    const user = await buscarUsuarioAtual();

    if (!collaboratorId || collaboratorId === user.id) {
        throw new Error(
            'Não é possível adicionar este usuário como colaborador.'
        );
    }

    await verificarAcessoIdeia(ideaId);

    const bloqueado = await verificarBloqueioMutuo(
        collaboratorId
    );

    if (bloqueado) {
        throw new Error(
            'Não é possível adicionar este usuário devido a um bloqueio.'
        );
    }

    const { data, error } = await supabase
        .from('idea_collaborators')
        .insert({
            idea_id: ideaId,
            user_id: collaboratorId,
            role: 'publisher'
        })
        .select()
        .single();

    if (error) throw error;

    return data;

}


// Remover colaborador
export async function removerColaborador(
    ideaId,
    collaboratorId
) {

    await buscarUsuarioAtual();

    const { error } = await supabase
        .from('idea_collaborators')
        .delete()
        .eq('idea_id', ideaId)
        .eq('user_id', collaboratorId);

    if (error) throw error;

    return true;

}


// =========================================
// VERSÕES
// =========================================


// Buscar histórico de versões
export async function buscarVersoes(ideaId) {

    await verificarAcessoIdeia(ideaId);

    const { data, error } = await supabase
        .from('idea_versions')
        .select(`
            id,
            idea_id,
            created_by,
            major_version,
            minor_version,
            title,
            description,
            change_summary,
            created_at,

            profiles:profiles!idea_versions_created_by_profiles_fkey (
                username,
                full_name,
                avatar_url
            )
        `)
        .eq('idea_id', ideaId)
        .order('major_version', { ascending: false })
        .order('minor_version', { ascending: false });

    if (error) throw error;

    return data || [];

}


// Publicar uma versão oficial
export async function publicarVersao(
    ideaId,
    title,
    description,
    changeSummary = null,
    novaVersaoPrincipal = false
) {
    const user = await buscarUsuarioAtual();

    const titulo = title?.trim();
    const descricao = description?.trim();

    if (!titulo) {
        throw new Error('O título da versão é obrigatório.');
    }

    if (titulo.length > 120) {
        throw new Error('O título deve ter no máximo 120 caracteres.');
    }

    if (!descricao) {
        throw new Error('A descrição da versão é obrigatória.');
    }

    // Preservar a verificação de acesso e bloqueios.
    await verificarAcessoIdeia(ideaId);

    // A numeração e a autorização são controladas pelo PostgreSQL.
    const { data, error } = await supabase
        .rpc('publicar_versao_ideia', {
            p_idea_id: ideaId,
            p_title: titulo,
            p_description: descricao,
            p_change_summary: changeSummary?.trim() || null,
            p_nova_versao_principal: novaVersaoPrincipal
        })
        .single();

    if (error) {
        throw error;
    }

    return data;
}