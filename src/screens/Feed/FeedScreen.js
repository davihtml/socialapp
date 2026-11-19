import React, { useEffect, useState, useRef } from 'react';

import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Image,
    Animated
} from 'react-native';

import {
    buscarPublicacoesPaginadas,
    buscarPublicacaoPorId,
    alternarCurtida,
    excluirPublicacao,
    buscarPublicacoesSalvas,
    alternarPublicacaoSalva
} from '../../services/posts';

import { supabase } from '../../services/supabase';

import { useAuth } from '../../contexts/AuthContext';


// Identidade visual
const CORES = {
    fundo: '#0B0910',
    cartao: '#17141E',
    cartaoSecundario: '#211B2B',
    destaque: '#B66AE8',
    texto: '#F2EFF7',
    textoSecundario: '#91899D',
    borda: '#292431',
    vermelho: '#D96B87'
};


// Quantidade de publicações por carregamento
const LIMITE_PUBLICACOES = 10;


// Botão com animação suave
function BotaoAnimado({
    children,
    style,
    onPress,
    disabled,
    ...props
}) {

    const escala = useRef(new Animated.Value(1)).current;

    function animar(valor) {

        Animated.spring(escala, {
            toValue: valor,
            speed: 25,
            bounciness: 4,
            useNativeDriver: true
        }).start();

    }

    return (

        <Animated.View
            style={[
                { transform: [{ scale: escala }] },
                style
            ]}
        >

            <TouchableOpacity
                onPress={onPress}
                onPressIn={() => animar(0.95)}
                onPressOut={() => animar(1)}
                disabled={disabled}
                activeOpacity={0.9}
                {...props}
            >

                {children}

            </TouchableOpacity>

        </Animated.View>

    );

}


// Formatar tempo
function formatarTempo(data) {

    const agora = new Date();
    const publicacao = new Date(data);

    const diferenca = Math.floor(
        (agora - publicacao) / 1000
    );

    if (diferenca < 60) return 'agora';

    if (diferenca < 3600) {
        return `${Math.floor(diferenca / 60)} min`;
    }

    if (diferenca < 86400) {
        return `${Math.floor(diferenca / 3600)} h`;
    }

    return `${Math.floor(diferenca / 86400)} d`;
}


// Componente de publicação
function Publicacao({
    item,
    userId,
    onCurtir,
    onSalvar,
    salva,
    onAbrirComentarios,
    onAbrirPerfil,
    onExcluir,
    onLayoutPost
}) {

    const perfil = item.profiles;

    const nome = perfil?.full_name || 'Usuário';
    const username = perfil?.username || 'usuario';

    const curtidas = item.likes || [];

    const curtiu = curtidas.some(
        curtida => curtida.user_id === userId
    );

    const entrada = useRef(new Animated.Value(0)).current;

    useEffect(() => {

        Animated.timing(entrada, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true
        }).start();

    }, []);

    return (

        <Animated.View
            onLayout={onLayoutPost}
            style={[
                styles.post,
                {
                    opacity: entrada,
                    transform: [
                        {
                            translateY: entrada.interpolate({
                                inputRange: [0, 1],
                                outputRange: [12, 0]
                            })
                        }
                    ]
                }
            ]}
        >

            {/* Cabeçalho */}

            <View style={styles.postHeader}>

                <TouchableOpacity
                    style={styles.avatar}
                    onPress={() => onAbrirPerfil(item.user_id)}
                    activeOpacity={0.8}
                >

                    {perfil?.avatar_url ? (

                        <Image
                            source={{ uri: perfil.avatar_url }}
                            style={styles.avatarImagem}
                        />

                    ) : (

                        <Text style={styles.avatarText}>
                            {nome.charAt(0).toUpperCase()}
                        </Text>

                    )}

                </TouchableOpacity>


                <View style={styles.userInfo}>

                    <TouchableOpacity
                        onPress={() => onAbrirPerfil(item.user_id)}
                    >

                        <Text style={styles.nome}>
                            {nome}
                        </Text>

                    </TouchableOpacity>

                    <Text style={styles.username}>
                        @{username}
                    </Text>

                </View>


                <Text style={styles.tempo}>
                    {formatarTempo(item.created_at)}
                </Text>


                {item.user_id === userId && (

                    <TouchableOpacity
                        onPress={() => onExcluir(item)}
                        style={styles.botaoExcluir}
                    >

                        <Text style={styles.iconeExcluir}>
                            ⋯
                        </Text>

                    </TouchableOpacity>

                )}

            </View>


            {/* Texto */}

            {item.content?.trim() ? (

                <Text style={styles.texto}>
                    {item.content}
                </Text>

            ) : null}


            {/* Imagem */}

            {item.image_url ? (

                <Image
                    source={{ uri: item.image_url }}
                    style={styles.imagemPublicacao}
                    resizeMode="cover"
                />

            ) : null}


            {/* Ações */}

            <View style={styles.actions}>

                {/* Curtir */}

                <BotaoAnimado
                    style={styles.action}
                    onPress={() => onCurtir(item, curtiu)}
                >

                    <Image
                        source={
                            curtiu
                                ? require('../../../assets/icons/LikedIcon.png')
                                : require('../../../assets/icons/LikeIcon.png')
                        }
                        style={styles.actionIconImage}
                        resizeMode="contain"
                    />

                    <Text style={styles.actionText}>
                        {curtidas.length}
                    </Text>

                </BotaoAnimado>


                {/* Comentários */}

                <BotaoAnimado
                    style={styles.action}
                    onPress={() => onAbrirComentarios(item)}
                >

                    <Image
                        source={require('../../../assets/icons/CommentsIcon.png')}
                        style={styles.actionIconImage}
                        resizeMode="contain"
                    />

                    <Text style={styles.actionText}>
                        {item.comments?.length || 0}
                    </Text>

                </BotaoAnimado>


                {/* Compartilhar */}

                <BotaoAnimado
                    style={styles.action}
                >

                    <Text style={styles.actionIcon}>
                        ↗
                    </Text>

                </BotaoAnimado>


                {/* Salvar publicação */}

                <BotaoAnimado
                    style={styles.actionSalvar}
                    onPress={() => onSalvar(item, salva)}
                >

                    <Text style={[
                        styles.iconeSalvar,
                        salva && styles.iconeSalvo
                    ]}>
                        {salva ? '▰' : '▱'}
                    </Text>

                    <Text style={[
                        styles.actionText,
                        salva && styles.textoSalvo
                    ]}>
                        {salva ? 'Salvo' : 'Salvar'}
                    </Text>

                </BotaoAnimado>

            </View>

        </Animated.View>

    );

}


// Tela principal
export default function FeedScreen({
    onLogout,
    onCriarPublicacao,
    onAbrirComentarios,
    onAbrirPerfil,
    onAbrirConversas,
    publicacaoParaAbrirId,
    onPublicacaoAberta,
    onAbrirNotificacoes,
    notificacoesNaoLidas
}) {

    const { user } = useAuth();

    const [publicacoes, setPublicacoes] = useState([]);

    const [publicacoesSalvas, setPublicacoesSalvas] = useState([]);

    const [loading, setLoading] = useState(true);
    const [atualizando, setAtualizando] = useState(false);
    const [carregandoMais, setCarregandoMais] = useState(false);
    const [temMais, setTemMais] = useState(true);

    // Referências para paginação
    const paginaAtual = useRef(0);
    const carregandoMaisRef = useRef(false);
    const temMaisRef = useRef(true);

    // Referências para navegação automática
    const scrollRef = useRef(null);

    const posicaoSecao = useRef(0);

    const posicoesPublicacoes = useRef({});

    const ultimaPublicacaoAberta = useRef(null);

    const buscaExtraId = useRef(null);


    // Atualizar informação sobre existência de mais publicações
    function atualizarTemMais(valor) {

        temMaisRef.current = valor;
        setTemMais(valor);

    }


    // Buscar publicações iniciais ou atualizar feed
    async function carregarPublicacoes() {

        try {

            paginaAtual.current = 0;

            atualizarTemMais(true);

            const dados = await buscarPublicacoesPaginadas(
                LIMITE_PUBLICACOES,
                0
            );

            setPublicacoes(dados || []);

            paginaAtual.current = 1;

            atualizarTemMais(
                dados.length === LIMITE_PUBLICACOES
            );

            // Buscar favoritos separadamente
            try {

                const salvas = await buscarPublicacoesSalvas();

                setPublicacoesSalvas(
                    salvas.map(publicacao => publicacao.id)
                );

            } catch (error) {

                console.log(
                    'Erro ao buscar publicações salvas:',
                    error
                );

            }

        } catch (error) {

            console.log('Erro ao buscar publicações:', error);

            Alert.alert(
                'Erro',
                'Não foi possível carregar as publicações.'
            );

        } finally {

            setLoading(false);
            setAtualizando(false);

        }

    }


    // Carregar mais publicações
    async function carregarMaisPublicacoes() {

        if (
            loading ||
            atualizando ||
            carregandoMaisRef.current ||
            !temMaisRef.current
        ) {
            return;
        }

        carregandoMaisRef.current = true;

        setCarregandoMais(true);

        try {

            const dados = await buscarPublicacoesPaginadas(
                LIMITE_PUBLICACOES,
                paginaAtual.current
            );

            if (dados && dados.length > 0) {

                setPublicacoes(publicacoesAtuais => {

                    const idsExistentes = new Set(
                        publicacoesAtuais.map(item => item.id)
                    );

                    const novasPublicacoes = dados.filter(
                        item => !idsExistentes.has(item.id)
                    );

                    return [
                        ...publicacoesAtuais,
                        ...novasPublicacoes
                    ];

                });

                paginaAtual.current += 1;

            }

            atualizarTemMais(
                dados.length === LIMITE_PUBLICACOES
            );

        } catch (error) {

            console.log(
                'Erro ao carregar mais publicações:',
                error
            );

        } finally {

            carregandoMaisRef.current = false;

            setCarregandoMais(false);

        }

    }


    // Detectar chegada ao final do feed
    function handleScroll(event) {

        const {
            layoutMeasurement,
            contentOffset,
            contentSize
        } = event.nativeEvent;

        const distanciaFinal =
            contentSize.height -
            (layoutMeasurement.height + contentOffset.y);

        if (distanciaFinal < 450) {
            carregarMaisPublicacoes();
        }

    }


    // Curtir ou descurtir publicação
    async function handleCurtir(item, jaCurtiu) {

        try {

            await alternarCurtida(item.id, jaCurtiu);

            setPublicacoes(publicacoesAtuais =>

                publicacoesAtuais.map(publicacao => {

                    if (publicacao.id !== item.id) {
                        return publicacao;
                    }

                    const curtidasAtuais = publicacao.likes || [];

                    return {

                        ...publicacao,

                        likes: jaCurtiu

                            ? curtidasAtuais.filter(
                                curtida => curtida.user_id !== user.id
                            )

                            : [
                                ...curtidasAtuais,
                                { user_id: user.id }
                            ]

                    };

                })

            );

        } catch (error) {

            console.log('Erro ao curtir:', error);

            Alert.alert(
                'Erro',
                'Não foi possível registrar sua curtida.'
            );

        }

    }


    // Salvar ou remover publicação dos favoritos
    async function handleSalvar(item, jaEstaSalva) {

        try {

            const resultado = await alternarPublicacaoSalva(
                item.id,
                jaEstaSalva
            );

            if (resultado) {

                setPublicacoesSalvas(atuais => {

                    if (atuais.includes(item.id)) {
                        return atuais;
                    }

                    return [...atuais, item.id];

                });

            } else {

                setPublicacoesSalvas(atuais =>
                    atuais.filter(id => id !== item.id)
                );

            }

        } catch (error) {

            console.log('Erro ao salvar publicação:', error);

            Alert.alert(
                'Erro',
                'Não foi possível atualizar seus favoritos.'
            );

        }

    }


    // Excluir publicação
    function handleExcluir(item) {

        Alert.alert(
            'Excluir publicação',
            'Tem certeza de que deseja excluir esta publicação?',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel'
                },
                {
                    text: 'Excluir',
                    style: 'destructive',

                    onPress: async () => {

                        try {

                            await excluirPublicacao(item.id);

                            setPublicacoes(publicacoesAtuais =>
                                publicacoesAtuais.filter(
                                    publicacao => publicacao.id !== item.id
                                )
                            );

                            setPublicacoesSalvas(atuais =>
                                atuais.filter(id => id !== item.id)
                            );

                            Alert.alert(
                                'Sucesso',
                                'Publicação excluída.'
                            );

                        } catch (error) {

                            console.log('Erro ao excluir publicação:', error);

                            Alert.alert(
                                'Erro',
                                'Não foi possível excluir esta publicação.'
                            );

                        }

                    }

                }

            ]

        );

    }


    // Tentar localizar e abrir uma publicação
    function tentarAbrirPublicacao(postId) {

        if (!postId || ultimaPublicacaoAberta.current === postId) {
            return;
        }

        const posicaoPost = posicoesPublicacoes.current[postId];

        if (posicaoPost === undefined) {
            return;
        }

        const posicaoFinal = posicaoSecao.current + posicaoPost;

        if (scrollRef.current) {

            scrollRef.current.scrollTo({
                y: Math.max(0, posicaoFinal - 15),
                animated: true
            });

            ultimaPublicacaoAberta.current = postId;

            if (onPublicacaoAberta) {
                onPublicacaoAberta();
            }

        }

    }


    // Carregar feed ao abrir a tela
    useEffect(() => {

        carregarPublicacoes();

    }, []);


    // Atualizar feed
    function atualizarFeed() {

        if (carregandoMaisRef.current) {
            return;
        }

        setAtualizando(true);

        paginaAtual.current = 0;

        carregarPublicacoes();

    }


    // Limpar referência quando não houver publicação selecionada
    useEffect(() => {

        if (!publicacaoParaAbrirId) {

            ultimaPublicacaoAberta.current = null;
            buscaExtraId.current = null;

            return;

        }

    }, [publicacaoParaAbrirId]);


    // Localizar publicação solicitada pela notificação
    useEffect(() => {

        if (!publicacaoParaAbrirId || loading) {
            return;
        }

        const existe = publicacoes.some(
            item => item.id === publicacaoParaAbrirId
        );

        if (!existe) {

            // Buscar publicação específica, mesmo que seja antiga
            if (buscaExtraId.current !== publicacaoParaAbrirId) {

                buscaExtraId.current = publicacaoParaAbrirId;

                async function buscarPublicacaoNotificada() {

                    try {

                        const publicacao = await buscarPublicacaoPorId(
                            publicacaoParaAbrirId
                        );

                        if (!publicacao) {

                            Alert.alert(
                                'Publicação indisponível',
                                'Esta publicação pode ter sido excluída.'
                            );

                            if (onPublicacaoAberta) {
                                onPublicacaoAberta();
                            }

                            return;

                        }

                        setPublicacoes(publicacoesAtuais => {

                            const jaExiste = publicacoesAtuais.some(
                                item => item.id === publicacao.id
                            );

                            if (jaExiste) {
                                return publicacoesAtuais;
                            }

                            return [
                                ...publicacoesAtuais,
                                publicacao
                            ];

                        });

                    } catch (error) {

                        console.log(
                            'Erro ao buscar publicação da notificação:',
                            error
                        );

                        Alert.alert(
                            'Erro',
                            'Não foi possível localizar esta publicação.'
                        );

                        if (onPublicacaoAberta) {
                            onPublicacaoAberta();
                        }

                    }

                }

                buscarPublicacaoNotificada();

                return;

            }

            return;

        }

        tentarAbrirPublicacao(publicacaoParaAbrirId);

    }, [publicacoes, loading, publicacaoParaAbrirId]);


    return (

        <View style={styles.container}>

            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.feed}
                onScroll={handleScroll}
                scrollEventThrottle={400}
                refreshControl={

                    <RefreshControl
                        refreshing={atualizando}
                        onRefresh={atualizarFeed}
                        colors={[CORES.destaque]}
                        tintColor={CORES.destaque}
                    />

                }
            >

                {/* Cabeçalho */}

                <View style={styles.header}>

                    <View>

                        <Text style={styles.headerSubtitulo}>
                            COMUNIDADE
                        </Text>

                        <Text style={styles.headerTitulo}>
                            Feed
                        </Text>

                    </View>

                    <View style={styles.headerDireita}>

                        <Text style={styles.logo}>
                            logo
                        </Text>

                        <TouchableOpacity
                            style={styles.botaoNotificacoes}
                            onPress={onAbrirNotificacoes}
                            activeOpacity={0.8}
                        >

                            <Image
                                source={require('../../../assets/icons/NotificationIcon.png')}
                                style={styles.iconeNotificacoes}
                                resizeMode="contain"
                            />

                            {notificacoesNaoLidas > 0 && (

                                <View style={styles.badgeNotificacoes}>

                                    <Text style={styles.badgeNotificacoesTexto}>
                                        {notificacoesNaoLidas > 99
                                            ? '99+'
                                            : notificacoesNaoLidas}
                                    </Text>

                                </View>

                            )}

                        </TouchableOpacity>

                    </View>

                </View>


                {/* Criar publicação */}

                <BotaoAnimado
                    style={styles.criarPost}
                    onPress={onCriarPublicacao}
                >

                    <View style={styles.criarPostIcone}>

                        <Text style={styles.criarPostMais}>
                            ＋
                        </Text>

                    </View>

                    <View style={styles.criarPostInfo}>

                        <Text style={styles.criarPostTitulo}>
                            Compartilhe algo
                        </Text>

                        <Text style={styles.criarPostSubtitulo}>
                            O que você gostaria de contar?
                        </Text>

                    </View>

                    <Text style={styles.criarPostSeta}>
                        ›
                    </Text>

                </BotaoAnimado>


                {/* Publicações */}

                <View
                    style={styles.secaoPublicacoes}
                    onLayout={event => {

                        posicaoSecao.current = event.nativeEvent.layout.y;

                        if (publicacaoParaAbrirId) {
                            tentarAbrirPublicacao(publicacaoParaAbrirId);
                        }

                    }}
                >

                    <View style={styles.secaoHeader}>

                        <Text style={styles.secaoTitulo}>
                            PUBLICAÇÕES
                        </Text>

                        <Text style={styles.secaoQuantidade}>
                            {publicacoes.length}
                        </Text>

                    </View>


                    {loading ? (

                        <ActivityIndicator
                            size="large"
                            color={CORES.destaque}
                            style={styles.loader}
                        />

                    ) : publicacoes.length === 0 ? (

                        <View style={styles.emptyContainer}>

                            <Text style={styles.emptyIcon}>
                                ◇
                            </Text>

                            <Text style={styles.emptyTitle}>
                                Ainda não há publicações
                            </Text>

                            <Text style={styles.emptyText}>
                                Compartilhe algo e comece a movimentar a comunidade.
                            </Text>

                            <BotaoAnimado
                                style={styles.emptyButton}
                                onPress={onCriarPublicacao}
                            >

                                <Text style={styles.emptyButtonText}>
                                    Criar publicação
                                </Text>

                            </BotaoAnimado>

                        </View>

                    ) : (

                        publicacoes.map(item => (

                            <Publicacao
                                key={item.id}
                                item={item}
                                userId={user?.id}
                                salva={publicacoesSalvas.includes(item.id)}
                                onCurtir={handleCurtir}
                                onSalvar={handleSalvar}
                                onAbrirComentarios={onAbrirComentarios}
                                onAbrirPerfil={onAbrirPerfil}
                                onExcluir={handleExcluir}
                                onLayoutPost={event => {

                                    posicoesPublicacoes.current[item.id] =
                                        event.nativeEvent.layout.y;

                                    if (publicacaoParaAbrirId === item.id) {
                                        tentarAbrirPublicacao(item.id);
                                    }

                                }}
                            />

                        ))

                    )}


                    {/* Indicador de carregamento de mais publicações */}

                    {carregandoMais && (

                        <ActivityIndicator
                            size="small"
                            color={CORES.destaque}
                            style={styles.loaderMais}
                        />

                    )}


                    {/* Fim do feed */}

                    {!loading &&
                        !carregandoMais &&
                        publicacoes.length > 0 &&
                        !temMais && (

                            <Text style={styles.fimFeed}>
                                Você chegou ao fim das publicações.
                            </Text>

                        )}

                </View>

            </ScrollView>

        </View>

    );

}


// Estilos
const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: CORES.fundo
    },

    feed: {
        paddingTop: 20,
        paddingBottom: 115,
        flexGrow: 1
    },

    // Cabeçalho
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 21,
        marginBottom: 27
    },

    headerSubtitulo: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.7,
        color: CORES.textoSecundario,
        marginBottom: 5
    },

    headerTitulo: {
        fontSize: 27,
        fontWeight: '700',
        color: CORES.texto
    },

    headerDireita: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18
    },

    logo: {
        fontSize: 24,
        fontWeight: '700',
        color: CORES.texto,
        letterSpacing: -1
    },

    botaoNotificacoes: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center'
    },

    iconeNotificacoes: {
        width: 23,
        height: 23
    },

    badgeNotificacoes: {
        position: 'absolute',
        top: -3,
        right: -5,
        minWidth: 17,
        height: 17,
        paddingHorizontal: 4,
        borderRadius: 9,
        backgroundColor: CORES.vermelho,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: CORES.fundo
    },

    badgeNotificacoesTexto: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FFFFFF'
    },

    // Criar publicação
    criarPost: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 18,
        marginBottom: 29,
        padding: 14,
        borderRadius: 16,
        backgroundColor: CORES.cartao,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    criarPostIcone: {
        width: 42,
        height: 42,
        borderRadius: 13,
        backgroundColor: CORES.cartaoSecundario,
        justifyContent: 'center',
        alignItems: 'center'
    },

    criarPostMais: {
        fontSize: 25,
        color: CORES.destaque
    },

    criarPostInfo: {
        flex: 1,
        marginLeft: 12
    },

    criarPostTitulo: {
        fontSize: 13,
        fontWeight: '700',
        color: CORES.texto
    },

    criarPostSubtitulo: {
        fontSize: 11,
        color: CORES.textoSecundario,
        marginTop: 4
    },

    criarPostSeta: {
        fontSize: 24,
        color: CORES.textoSecundario,
        marginLeft: 8
    },

    // Publicações
    secaoPublicacoes: {
        paddingHorizontal: 18
    },

    secaoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 9,
        paddingHorizontal: 3
    },

    secaoTitulo: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.6,
        color: CORES.textoSecundario
    },

    secaoQuantidade: {
        fontSize: 11,
        color: CORES.textoSecundario
    },

    loader: {
        marginTop: 65
    },

    loaderMais: {
        marginTop: 22,
        marginBottom: 22
    },

    fimFeed: {
        color: CORES.textoSecundario,
        fontSize: 11,
        textAlign: 'center',
        paddingVertical: 25
    },

    // Estado vazio
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 25,
        paddingVertical: 60,
        backgroundColor: CORES.cartao,
        borderRadius: 17,
        marginTop: 8
    },

    emptyIcon: {
        fontSize: 35,
        color: CORES.destaque,
        marginBottom: 15
    },

    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: CORES.texto,
        marginBottom: 8
    },

    emptyText: {
        textAlign: 'center',
        color: CORES.textoSecundario,
        fontSize: 13,
        lineHeight: 21
    },

    emptyButton: {
        marginTop: 22,
        backgroundColor: CORES.destaque,
        paddingHorizontal: 19,
        paddingVertical: 11,
        borderRadius: 11
    },

    emptyButtonText: {
        color: CORES.fundo,
        fontSize: 12,
        fontWeight: '700'
    },

    // Cartão da publicação
    post: {
        padding: 15,
        backgroundColor: CORES.cartao,
        marginVertical: 7,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    postHeader: {
        flexDirection: 'row',
        alignItems: 'center'
    },

    avatar: {
        width: 43,
        height: 43,
        borderRadius: 15,
        backgroundColor: CORES.cartaoSecundario,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 11,
        overflow: 'hidden'
    },

    avatarImagem: {
        width: '100%',
        height: '100%',
        borderRadius: 15
    },

    avatarText: {
        color: CORES.texto,
        fontSize: 17,
        fontWeight: '700'
    },

    userInfo: {
        flex: 1
    },

    nome: {
        fontSize: 14,
        fontWeight: '700',
        color: CORES.texto
    },

    username: {
        fontSize: 11,
        color: CORES.textoSecundario,
        marginTop: 3
    },

    tempo: {
        fontSize: 10,
        color: CORES.textoSecundario,
        marginLeft: 5
    },

    botaoExcluir: {
        paddingHorizontal: 5,
        marginLeft: 5
    },

    iconeExcluir: {
        fontSize: 22,
        color: CORES.textoSecundario
    },

    texto: {
        fontSize: 14,
        lineHeight: 22,
        color: CORES.texto,
        marginTop: 15
    },

    imagemPublicacao: {
        width: '100%',
        height: 250,
        borderRadius: 13,
        marginTop: 14,
        backgroundColor: CORES.cartaoSecundario
    },

    // Ações
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: CORES.borda,
        gap: 20
    },

    action: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },

    actionIconImage: {
        width: 21,
        height: 21
    },

    actionIcon: {
        fontSize: 19,
        color: CORES.textoSecundario
    },

    actionText: {
        fontSize: 12,
        color: CORES.textoSecundario
    },

    // Favoritos
    actionSalvar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginLeft: 'auto'
    },

    iconeSalvar: {
        fontSize: 21,
        color: CORES.textoSecundario
    },

    iconeSalvo: {
        color: CORES.destaque
    },

    textoSalvo: {
        color: CORES.destaque,
        fontWeight: '700'
    }

});