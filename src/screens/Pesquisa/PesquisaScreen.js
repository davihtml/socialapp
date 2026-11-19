import React, { useState, useEffect, useRef } from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Image,
    ActivityIndicator
} from 'react-native';

import {
    pesquisarUsuarios,
    buscarSugestoesUsuarios
} from '../../services/profiles';

import {
    seguirUsuario
} from '../../services/follows';

import {
    buscarPublicacoesExplorar
} from '../../services/posts';


const CORES = {
    fundo: '#0B0910',
    card: '#17141E',
    destaque: '#B66AE8',
    texto: '#F2EFF7',
    secundario: '#91899D',
    borda: '#292431'
};


const LIMITE_PUBLICACOES = 30;


export default function PesquisaScreen({
    onVoltar,
    onAbrirPerfil,
    onAbrirPublicacao
}) {

    const [termo, setTermo] = useState('');

    const [usuarios, setUsuarios] = useState([]);
    const [sugestoes, setSugestoes] = useState([]);
    const [publicacoes, setPublicacoes] = useState([]);

    const [loading, setLoading] = useState(false);
    const [loadingSugestoes, setLoadingSugestoes] = useState(true);
    const [loadingPublicacoes, setLoadingPublicacoes] = useState(true);

    const [carregandoMaisPublicacoes, setCarregandoMaisPublicacoes] = useState(false);
    const [temMaisPublicacoes, setTemMaisPublicacoes] = useState(true);

    const [pesquisou, setPesquisou] = useState(false);
    const [seguindoId, setSeguindoId] = useState(null);

    const [paginaPublicacoes, setPaginaPublicacoes] = useState(0);

    const temporizador = useRef(null);
    const carregandoMaisRef = useRef(false);
    const paginaPublicacoesRef = useRef(0);


    // Buscar sugestões de pessoas
    async function carregarSugestoes() {

        try {

            setLoadingSugestoes(true);

            const resultados = await buscarSugestoesUsuarios();

            setSugestoes(resultados);

        } catch (error) {

            console.log('Erro ao buscar sugestões:', error);

            setSugestoes([]);

        } finally {

            setLoadingSugestoes(false);

        }

    }


    // Buscar primeira página de publicações
    async function carregarPublicacoes() {

        try {

            setLoadingPublicacoes(true);

            paginaPublicacoesRef.current = 0;
            setPaginaPublicacoes(0);
            setTemMaisPublicacoes(true);

            const resultados = await buscarPublicacoesExplorar(
                LIMITE_PUBLICACOES,
                0
            );

            setPublicacoes(resultados);

            setTemMaisPublicacoes(
                resultados.length === LIMITE_PUBLICACOES
            );

        } catch (error) {

            console.log('Erro ao buscar publicações do explorar:', error);

            setPublicacoes([]);
            setTemMaisPublicacoes(false);

        } finally {

            setLoadingPublicacoes(false);

        }

    }


    // Carregar próxima página de publicações
    async function carregarMaisPublicacoes() {

        if (
            loadingPublicacoes ||
            carregandoMaisRef.current ||
            !temMaisPublicacoes
        ) {
            return;
        }

        try {

            carregandoMaisRef.current = true;
            setCarregandoMaisPublicacoes(true);

            const proximaPagina = paginaPublicacoesRef.current + 1;

            const resultados = await buscarPublicacoesExplorar(
                LIMITE_PUBLICACOES,
                proximaPagina
            );

            setPublicacoes(prev => {

                const idsExistentes = new Set(
                    prev.map(item => item.id)
                );

                const novasPublicacoes = resultados.filter(
                    item => !idsExistentes.has(item.id)
                );

                return [...prev, ...novasPublicacoes];

            });

            paginaPublicacoesRef.current = proximaPagina;
            setPaginaPublicacoes(proximaPagina);

            setTemMaisPublicacoes(
                resultados.length === LIMITE_PUBLICACOES
            );

        } catch (error) {

            console.log('Erro ao carregar mais publicações:', error);

        } finally {

            carregandoMaisRef.current = false;
            setCarregandoMaisPublicacoes(false);

        }

    }


    // Carregar conteúdo ao abrir a tela
    useEffect(() => {

        carregarSugestoes();
        carregarPublicacoes();

    }, []);


    // Pesquisar usuários por nome ou username
    async function executarPesquisa(texto) {

        const busca = texto.trim().replace(/^@/, '');

        if (!busca) {

            setUsuarios([]);
            setPesquisou(false);
            setLoading(false);

            return;

        }

        try {

            setLoading(true);

            const resultados = await pesquisarUsuarios(busca);

            setUsuarios(resultados);

            setPesquisou(true);

        } catch (error) {

            console.log('Erro na pesquisa:', error);

            setUsuarios([]);

            setPesquisou(true);

        } finally {

            setLoading(false);

        }

    }


    // Aguardar um pouco antes de pesquisar
    useEffect(() => {

        clearTimeout(temporizador.current);

        temporizador.current = setTimeout(() => {
            executarPesquisa(termo);
        }, 400);

        return () => clearTimeout(temporizador.current);

    }, [termo]);


    // Seguir usuário diretamente pelas sugestões
    async function handleSeguir(userId) {

        try {

            setSeguindoId(userId);

            await seguirUsuario(userId);

            setSugestoes(prev =>
                prev.filter(usuario => usuario.id !== userId)
            );

        } catch (error) {

            console.log('Erro ao seguir usuário:', error);

        } finally {

            setSeguindoId(null);

        }

    }


    // Resultado individual de usuário
    function renderizarUsuario({ item }) {

        return (

            <TouchableOpacity
                style={styles.usuario}
                onPress={() => onAbrirPerfil?.(item.id)}
                activeOpacity={0.7}
            >

                <View style={styles.avatar}>

                    {item.avatar_url ? (

                        <Image
                            source={{ uri: item.avatar_url }}
                            style={styles.avatarImagem}
                        />

                    ) : (

                        <Text style={styles.avatarTexto}>
                            {(item.full_name || item.username || 'U')
                                .charAt(0)
                                .toUpperCase()}
                        </Text>

                    )}

                </View>


                <View style={styles.informacoes}>

                    <Text style={styles.nome}>
                        {item.full_name || 'Usuário'}
                    </Text>

                    <Text style={styles.username}>
                        @{item.username || 'usuario'}
                    </Text>

                </View>


                <Text style={styles.seta}>
                    →
                </Text>

            </TouchableOpacity>

        );

    }


    // Sugestão individual de usuário
    function renderizarSugestao({ item }) {

        return (

            <View style={styles.usuario}>

                <TouchableOpacity
                    style={styles.areaPerfil}
                    onPress={() => onAbrirPerfil?.(item.id)}
                    activeOpacity={0.7}
                >

                    <View style={styles.avatar}>

                        {item.avatar_url ? (

                            <Image
                                source={{ uri: item.avatar_url }}
                                style={styles.avatarImagem}
                            />

                        ) : (

                            <Text style={styles.avatarTexto}>
                                {(item.full_name || item.username || 'U')
                                    .charAt(0)
                                    .toUpperCase()}
                            </Text>

                        )}

                    </View>


                    <View style={styles.informacoes}>

                        <Text style={styles.nome}>
                            {item.full_name || 'Usuário'}
                        </Text>

                        <Text style={styles.username}>
                            @{item.username || 'usuario'}
                        </Text>

                    </View>

                </TouchableOpacity>


                <TouchableOpacity
                    style={styles.botaoSeguir}
                    onPress={() => handleSeguir(item.id)}
                    disabled={seguindoId === item.id}
                    activeOpacity={0.8}
                >

                    {seguindoId === item.id ? (

                        <ActivityIndicator
                            size="small"
                            color={CORES.texto}
                        />

                    ) : (

                        <Text style={styles.textoSeguir}>
                            Seguir
                        </Text>

                    )}

                </TouchableOpacity>

            </View>

        );

    }


    // Cabeçalho da área Explorar
    function renderizarExplorar() {

        return (

            <View>

                {/* Sugestões de pessoas */}

                <View style={styles.secao}>

                    <View style={styles.tituloSecaoArea}>

                        <View>

                            <Text style={styles.tituloSecao}>
                                Descubra pessoas
                            </Text>

                            <Text style={styles.subtituloSecao}>
                                Encontre novos perfis para acompanhar.
                            </Text>

                        </View>

                    </View>


                    {loadingSugestoes ? (

                        <View style={styles.carregando}>

                            <ActivityIndicator
                                size="small"
                                color={CORES.destaque}
                            />

                            <Text style={styles.estadoTexto}>
                                Buscando pessoas...
                            </Text>

                        </View>

                    ) : sugestoes.length > 0 ? (

                        sugestoes.map(item => (
                            <View key={item.id}>
                                {renderizarSugestao({ item })}
                            </View>
                        ))

                    ) : (

                        <Text style={styles.mensagemSecao}>
                            Você já segue todos os perfis disponíveis.
                        </Text>

                    )}

                </View>


                {/* Publicações */}

                <View style={styles.secaoPublicacoes}>

                    <Text style={styles.tituloSecao}>
                        Publicações para descobrir
                    </Text>

                    <Text style={styles.subtituloSecao}>
                        Explore o que outras pessoas estão compartilhando.
                    </Text>

                </View>

            </View>

        );

    }


    // Publicação individual da grade
    function renderizarPublicacao({ item }) {

        return (

            <TouchableOpacity
                style={styles.itemGrade}
                onPress={() => onAbrirPublicacao?.(item.id)}
                activeOpacity={0.8}
            >

                <Image
                    source={{ uri: item.image_url }}
                    style={styles.imagemPublicacao}
                    resizeMode="cover"
                />

            </TouchableOpacity>

        );

    }


    // Rodapé da grade
    function renderizarRodapePublicacoes() {

        if (carregandoMaisPublicacoes) {

            return (

                <View style={styles.rodapeCarregando}>

                    <ActivityIndicator
                        size="small"
                        color={CORES.destaque}
                    />

                    <Text style={styles.estadoTexto}>
                        Carregando mais publicações...
                    </Text>

                </View>

            );

        }

        if (publicacoes.length > 0 && !temMaisPublicacoes) {

            return (

                <Text style={styles.fimPublicacoes}>
                    Você chegou ao fim das publicações.
                </Text>

            );

        }

        return null;

    }


    return (

        <View style={styles.container}>

            {/* Cabeçalho */}

            <View style={styles.header}>

                <TouchableOpacity
                    style={styles.botaoVoltar}
                    onPress={onVoltar}
                >

                    <Text style={styles.iconeVoltar}>
                        ‹
                    </Text>

                </TouchableOpacity>

                <Text style={styles.titulo}>
                    Explorar
                </Text>

                <View style={styles.espaco} />

            </View>


            {/* Campo de pesquisa */}

            <View style={styles.areaPesquisa}>

                <View style={styles.campoPesquisa}>

                    <Text style={styles.iconePesquisa}>
                        ⌕
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Nome ou @username"
                        placeholderTextColor={CORES.secundario}
                        value={termo}
                        onChangeText={setTermo}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="search"
                        onSubmitEditing={() => executarPesquisa(termo)}
                    />

                    {!!termo && (

                        <TouchableOpacity
                            onPress={() => setTermo('')}
                        >

                            <Text style={styles.limpar}>
                                ×
                            </Text>

                        </TouchableOpacity>

                    )}

                </View>

            </View>


            {/* Conteúdo */}

            {termo.trim() ? (

                <FlatList
                    data={usuarios}
                    keyExtractor={item => item.id}
                    renderItem={renderizarUsuario}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.lista}
                    ListHeaderComponent={() => {

                        if (loading) {

                            return (

                                <View style={styles.carregando}>

                                    <ActivityIndicator
                                        size="small"
                                        color={CORES.destaque}
                                    />

                                    <Text style={styles.estadoTexto}>
                                        Procurando pessoas...
                                    </Text>

                                </View>

                            );

                        }

                        return null;

                    }}
                    ListEmptyComponent={() => {

                        if (loading || !pesquisou) {
                            return null;
                        }

                        return (

                            <View style={styles.estadoVazio}>

                                <Text style={styles.estadoIcone}>
                                    ◯
                                </Text>

                                <Text style={styles.estadoTitulo}>
                                    Nenhum usuário encontrado
                                </Text>

                                <Text style={styles.estadoTexto}>
                                    Tente pesquisar com outro nome ou username.
                                </Text>

                            </View>

                        );

                    }}
                />

            ) : (

                <FlatList
                    key="grade-explorar"
                    data={publicacoes}
                    keyExtractor={item => item.id}
                    renderItem={renderizarPublicacao}
                    numColumns={3}
                    columnWrapperStyle={styles.linhaGrade}
                    ListHeaderComponent={renderizarExplorar}
                    ListEmptyComponent={() => {

                        if (loadingPublicacoes) {

                            return (

                                <View style={styles.carregando}>

                                    <ActivityIndicator
                                        size="small"
                                        color={CORES.destaque}
                                    />

                                    <Text style={styles.estadoTexto}>
                                        Carregando publicações...
                                    </Text>

                                </View>

                            );

                        }

                        return (

                            <View style={styles.estadoVazio}>

                                <Text style={styles.estadoIcone}>
                                    ◯
                                </Text>

                                <Text style={styles.estadoTitulo}>
                                    Nenhuma publicação disponível
                                </Text>

                                <Text style={styles.estadoTexto}>
                                    Novas publicações com imagens aparecerão aqui.
                                </Text>

                            </View>

                        );

                    }}
                    ListFooterComponent={renderizarRodapePublicacoes}
                    onEndReached={carregarMaisPublicacoes}
                    onEndReachedThreshold={0.5}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.lista}
                />

            )}

        </View>

    );

}


const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: CORES.fundo
    },

    header: {
        height: 62,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: CORES.borda
    },

    botaoVoltar: {
        width: 40,
        height: 40,
        borderRadius: 13,
        backgroundColor: CORES.card,
        alignItems: 'center',
        justifyContent: 'center'
    },

    iconeVoltar: {
        fontSize: 32,
        color: CORES.texto,
        lineHeight: 35
    },

    titulo: {
        fontSize: 17,
        fontWeight: '700',
        color: CORES.texto
    },

    espaco: {
        width: 40
    },

    areaPesquisa: {
        paddingHorizontal: 18,
        paddingVertical: 17
    },

    campoPesquisa: {
        height: 51,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CORES.card,
        borderWidth: 1,
        borderColor: CORES.borda,
        borderRadius: 15,
        paddingHorizontal: 15
    },

    iconePesquisa: {
        fontSize: 25,
        color: CORES.destaque,
        marginRight: 10
    },

    input: {
        flex: 1,
        height: '100%',
        color: CORES.texto,
        fontSize: 13
    },

    limpar: {
        fontSize: 25,
        color: CORES.secundario,
        paddingHorizontal: 5
    },

    lista: {
        paddingHorizontal: 18,
        paddingBottom: 110,
        flexGrow: 1
    },

    secao: {
        marginBottom: 27
    },

    tituloSecaoArea: {
        marginBottom: 15
    },

    tituloSecao: {
        color: CORES.texto,
        fontSize: 17,
        fontWeight: '700'
    },

    subtituloSecao: {
        color: CORES.secundario,
        fontSize: 12,
        marginTop: 5,
        lineHeight: 18
    },

    usuario: {
        minHeight: 75,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 13,
        marginBottom: 9,
        backgroundColor: CORES.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    areaPerfil: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center'
    },

    avatar: {
        width: 47,
        height: 47,
        borderRadius: 24,
        backgroundColor: '#211B2B',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: CORES.borda
    },

    avatarImagem: {
        width: '100%',
        height: '100%'
    },

    avatarTexto: {
        color: CORES.destaque,
        fontSize: 19,
        fontWeight: '700'
    },

    informacoes: {
        flex: 1,
        marginLeft: 12
    },

    nome: {
        color: CORES.texto,
        fontSize: 14,
        fontWeight: '700'
    },

    username: {
        color: CORES.secundario,
        fontSize: 12,
        marginTop: 4
    },

    seta: {
        color: CORES.destaque,
        fontSize: 20,
        marginRight: 5
    },

    botaoSeguir: {
        minWidth: 76,
        height: 34,
        paddingHorizontal: 13,
        borderRadius: 11,
        backgroundColor: CORES.destaque,
        alignItems: 'center',
        justifyContent: 'center'
    },

    textoSeguir: {
        color: CORES.texto,
        fontSize: 12,
        fontWeight: '700'
    },

    secaoPublicacoes: {
        marginBottom: 15
    },

    linhaGrade: {
        justifyContent: 'space-between'
    },

    itemGrade: {
        width: '32.8%',
        aspectRatio: 1,
        marginBottom: 4,
        backgroundColor: CORES.card,
        borderRadius: 5,
        overflow: 'hidden'
    },

    imagemPublicacao: {
        width: '100%',
        height: '100%'
    },

    estadoVazio: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 25,
        paddingVertical: 45
    },

    estadoIcone: {
        fontSize: 35,
        color: CORES.destaque,
        marginBottom: 13
    },

    estadoTitulo: {
        color: CORES.texto,
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center'
    },

    estadoTexto: {
        color: CORES.secundario,
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 19
    },

    mensagemSecao: {
        color: CORES.secundario,
        fontSize: 12,
        marginTop: 12
    },

    carregando: {
        alignItems: 'center',
        paddingVertical: 25,
        gap: 10
    },

    rodapeCarregando: {
        alignItems: 'center',
        paddingVertical: 22,
        gap: 10
    },

    fimPublicacoes: {
        color: CORES.secundario,
        fontSize: 11,
        textAlign: 'center',
        paddingVertical: 22
    }

});