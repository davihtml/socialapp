import React, { useEffect, useState, useRef } from 'react';

import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Alert,
    Image
} from 'react-native';

import * as Notifications from 'expo-notifications';

import FeedScreen from '../Feed/FeedScreen';
import CriarPublicacaoScreen from '../CriarPublicacao/CriarPublicacaoScreen';
import ComentariosScreen from '../Comentarios/ComentariosScreen';
import PerfilScreen from '../Perfil/PerfilScreen';
import EditarPerfilScreen from '../EditarPerfil/EditarPerfilScreen';
import ConversasScreen from '../Conversas/ConversasScreen';
import ChatScreen from '../Chat/ChatScreen';
import NotificacoesScreen from '../Notifications/NotificacoesScreen';
import PesquisaScreen from '../Pesquisa/PesquisaScreen';
import SalvosScreen from '../Salvos/SalvosScreen';
import IdeiasScreen from '../Ideias/IdeiasScreen';
import CriarGrupoScreen from '../CriarGrupo/CriarGrupoScreen';
import GroupChatScreen from '../GroupChat/GroupChatScreen';

import { useAuth } from '../../contexts/AuthContext';

import { logoutUsuario } from '../../services/auth';
import { buscarPerfil } from '../../services/profiles';
import { buscarPublicacoes } from '../../services/posts';

import {
    buscarOuCriarConversa,
    buscarConversas,
    contarMensagensNaoLidas
} from '../../services/chat';

import {
    contarNotificacoesNaoLidas,
    marcarNotificacaoComoLida
} from '../../services/notifications';

import { supabase } from '../../services/supabase';


// Ícones personalizados
const ICONES = {
    inicio: require('../../../assets/icons/HomeIcon.png'),
    mensagens: require('../../../assets/icons/ChatIcon.png'),
    notificacoes: require('../../../assets/icons/NotificationIcon.png'),
    perfil: require('../../../assets/icons/ProfileIcon.png')
};


// Identidade visual
const CORES = {
    fundo: '#0B0910',
    barra: '#191521',
    destaque: '#B66AE8',
    texto: '#F2EFF7',
    secundario: '#91899D',
    borda: '#30283B'
};


// Botão animado
function BotaoNav({ children, onPress, estilo }) {

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
                estilo
            ]}
        >

            <TouchableOpacity
                onPress={onPress}
                onPressIn={() => animar(0.92)}
                onPressOut={() => animar(1)}
                activeOpacity={0.9}
                style={styles.navButton}
            >

                {children}

            </TouchableOpacity>

        </Animated.View>

    );

}


// Tela principal
export default function HomeScreen() {

    const { user } = useAuth();

    const [tela, setTela] = useState('feed');

    const [grupoSelecionado, setGrupoSelecionado] = useState(null);

    const [telaAnteriorPerfil, setTelaAnteriorPerfil] = useState('feed');

    const [telaAnteriorComentarios, setTelaAnteriorComentarios] = useState('feed');

    const [publicacaoSelecionada, setPublicacaoSelecionada] = useState(null);

    const [publicacaoParaAbrirId, setPublicacaoParaAbrirId] = useState(null);

    const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);

    const [perfilSelecionado, setPerfilSelecionado] = useState(null);

    const [conversaSelecionada, setConversaSelecionada] = useState(null);

    const [perfilChat, setPerfilChat] = useState(null);

    const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);

    const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);

    const notificacaoProcessada = useRef(null);


    // Buscar mensagens não lidas
    async function carregarMensagensNaoLidas() {

        try {

            const conversas = await buscarConversas();

            const quantidades = await Promise.all(

                conversas.map(conversa =>
                    contarMensagensNaoLidas(conversa.id)
                )

            );

            const total = quantidades.reduce(
                (soma, quantidade) => soma + quantidade,
                0
            );

            setMensagensNaoLidas(total);

        } catch (error) {

            console.log(
                'Erro ao buscar mensagens não lidas:',
                error
            );

        }

    }


    // Buscar notificações não lidas
    async function carregarNotificacoesNaoLidas() {

        try {

            const total = await contarNotificacoesNaoLidas();

            setNotificacoesNaoLidas(total);

        } catch (error) {

            console.log(
                'Erro ao buscar notificações não lidas:',
                error
            );

        }

    }


    // Atualizar contadores em tempo real
    useEffect(() => {

        if (!user?.id) return;

        carregarMensagensNaoLidas();

        carregarNotificacoesNaoLidas();

        const canalMensagens = supabase
            .channel('home-mensagens-nao-lidas')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages'
                },
                () => {
                    carregarMensagensNaoLidas();
                }
            )
            .subscribe();


        const canalNotificacoes = supabase
            .channel('home-notificacoes-nao-lidas')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_id=eq.${user.id}`
                },
                () => {
                    carregarNotificacoesNaoLidas();
                }
            )
            .subscribe();


        return () => {

            supabase.removeChannel(canalMensagens);

            supabase.removeChannel(canalNotificacoes);

        };

    }, [user?.id]);


    // Sair da conta
    async function handleLogout() {

        try {

            await logoutUsuario();

        } catch (error) {

            Alert.alert(
                'Erro',
                'Não foi possível sair da conta.'
            );

            console.log(error);

        }

    }


    // Abrir perfil através de uma notificação
    function abrirPerfilNotificacao(userId, origem = 'feed') {

        setUsuarioSelecionado(userId);

        setPerfilSelecionado(null);

        setTelaAnteriorPerfil(origem);

        setTela('perfil');

    }


    // Abrir perfil através da pesquisa
    function abrirPerfilPesquisa(userId) {

        setUsuarioSelecionado(userId);

        setPerfilSelecionado(null);

        setTelaAnteriorPerfil('pesquisa');

        setTela('perfil');

    }


    // Abrir perfil através das publicações salvas
    function abrirPerfilSalvos(userId) {

        setUsuarioSelecionado(userId);

        setPerfilSelecionado(null);

        setTelaAnteriorPerfil('salvos');

        setTela('perfil');

    }


    // Abrir publicação através de uma notificação ou dos salvos
    function abrirPublicacaoNotificacao(postId) {

        setPublicacaoParaAbrirId(postId);

        setPublicacaoSelecionada(null);

        setTela('feed');

    }


    // Abrir comentários de uma publicação
    async function abrirComentariosNotificacao(postId, origem = 'feed') {

        try {

            const publicacoes = await buscarPublicacoes();

            const publicacao = publicacoes.find(
                item => item.id === postId
            );

            if (!publicacao) {

                Alert.alert(
                    'Publicação indisponível',
                    'Esta publicação pode ter sido excluída.'
                );

                return;

            }

            setPublicacaoSelecionada(publicacao);

            setTelaAnteriorComentarios(origem);

            setTela('comentarios');

        } catch (error) {

            console.log(
                'Erro ao localizar publicação:',
                error
            );

            Alert.alert(
                'Erro',
                'Não foi possível abrir os comentários.'
            );

        }

    }


    // Abrir ou criar conversa
    async function abrirChat(userId) {

        try {

            const conversa = await buscarOuCriarConversa(userId);

            const perfil = await buscarPerfil(userId);

            setConversaSelecionada(conversa);

            setPerfilChat(perfil);

            setTela('chat');

        } catch (error) {

            console.log('Erro ao abrir conversa:', error);

            Alert.alert(
                'Erro',
                'Não foi possível abrir a conversa.'
            );

        }

    }


    // Processar toque em notificações push
    useEffect(() => {

        if (!user?.id) return;

        async function processarNotificacao(response) {

            if (!response) return;

            const data =
                response.notification.request.content.data;

            if (!data) return;

            const notificationId = data.notificationId;

            // Evitar processar a mesma notificação duas vezes
            const identificador = notificationId ||
                response.notification.request.identifier;

            if (
                notificacaoProcessada.current === identificador
            ) {
                return;
            }

            notificacaoProcessada.current = identificador;

            console.log('[PUSH] Notificação tocada:', data);

            // Marcar como lida
            if (notificationId) {

                try {

                    await marcarNotificacaoComoLida(notificationId);

                    carregarNotificacoesNaoLidas();

                } catch (error) {

                    console.log(
                        '[PUSH] Erro ao marcar como lida:',
                        error
                    );

                }

            }

            // Navegar conforme o tipo
            switch (data.type) {

                case 'like':

                    if (data.postId) {
                        abrirPublicacaoNotificacao(data.postId);
                    }

                    break;

                case 'comment':

                    if (data.postId) {
                        await abrirComentariosNotificacao(data.postId);
                    }

                    break;

                case 'follow':

                    if (data.senderId) {
                        abrirPerfilNotificacao(data.senderId);
                    }

                    break;

                case 'message':

                    if (data.senderId) {
                        await abrirChat(data.senderId);
                    }

                    break;

                default:

                    console.log(
                        '[PUSH] Tipo de notificação desconhecido:',
                        data.type
                    );

            }

            // Limpar resposta inicial
            await Notifications.clearLastNotificationResponseAsync();

        }


        // Detectar toque em notificação com o app aberto ou em segundo plano
        const subscription =
            Notifications.addNotificationResponseReceivedListener(
                processarNotificacao
            );


        // Verificar se o aplicativo foi aberto por uma notificação
        Notifications.getLastNotificationResponseAsync()
            .then(processarNotificacao)
            .catch(error => {

                console.log(
                    '[PUSH] Erro ao recuperar notificação:',
                    error
                );

            });


        return () => {
            subscription.remove();
        };

    }, [user?.id]);


    // Abrir conversa existente
    function abrirConversaExistente(conversa, perfil) {

        setConversaSelecionada(conversa);

        setPerfilChat(perfil);

        setTela('chat');

    }


    // Abrir notificações pelo Feed
    function abrirNotificacoes() {

        carregarNotificacoesNaoLidas();

        setTela('notificacoes');

    }


    // Abrir criação de grupo
    function abrirCriacaoGrupo() {

        setTela('criarGrupo');

    }


    // Abrir grupo
    function abrirGrupo(grupo) {

        setGrupoSelecionado(grupo);

        setTela('chatGrupo');

    }


    // Navegação inferior: somente as cinco telas principais
    const mostrarNavegacao = [
        'feed',
        'ideias',
        'conversas',
        'pesquisa',
        'perfil'
    ].includes(tela);


    // Conteúdo da tela
    let conteudo;


    // Criar publicação
    if (tela === 'criar') {

        conteudo = (

            <CriarPublicacaoScreen
                onVoltar={() => setTela('feed')}
                onPublicado={() => setTela('feed')}
            />

        );

    }


    // Comentários
    else if (tela === 'comentarios' && publicacaoSelecionada) {

        conteudo = (

            <ComentariosScreen
                publicacao={publicacaoSelecionada}
                onVoltar={() => {

                    setPublicacaoSelecionada(null);

                    setTela(telaAnteriorComentarios);

                }}
            />

        );

    }


    // Editar perfil
    else if (tela === 'editarPerfil' && perfilSelecionado) {

        conteudo = (

            <EditarPerfilScreen
                perfil={perfilSelecionado}

                onVoltar={() => setTela('perfil')}

                onSalvo={async () => {

                    try {

                        const perfilAtualizado = await buscarPerfil(
                            usuarioSelecionado
                        );

                        setPerfilSelecionado(perfilAtualizado);

                        setTela('perfil');

                    } catch (error) {

                        console.log(
                            'Erro ao atualizar perfil:',
                            error
                        );

                        Alert.alert(
                            'Erro',
                            'Não foi possível recarregar os dados do perfil.'
                        );

                        setTela('perfil');

                    }

                }}
            />

        );

    }


    // Ideias
    else if (tela === 'ideias') {

        conteudo = (

            <IdeiasScreen />

        );

    }


    // Criar grupo
    else if (tela === 'criarGrupo') {

        conteudo = (

            <CriarGrupoScreen
                onVoltar={() => setTela('conversas')}
                onGrupoCriado={abrirGrupo}
            />

        );

    }


    // Conversas
    else if (tela === 'conversas') {

        conteudo = (

            <ConversasScreen
                onVoltar={() => setTela('feed')}
                onAbrirConversa={abrirConversaExistente}
                onCriarGrupo={abrirCriacaoGrupo}
                onAbrirGrupo={abrirGrupo}
            />

        );

    }


    // Pesquisa / Explorar
    else if (tela === 'pesquisa') {

        conteudo = (

            <PesquisaScreen
                onVoltar={() => setTela('feed')}
                onAbrirPerfil={abrirPerfilPesquisa}
                onAbrirPublicacao={abrirPublicacaoNotificacao}
            />

        );

    }


    // Publicações salvas
    else if (tela === 'salvos') {

        conteudo = (

            <SalvosScreen
                onVoltar={() => setTela('perfil')}

                onAbrirPublicacao={abrirPublicacaoNotificacao}

                onAbrirPerfil={abrirPerfilSalvos}

                onAbrirComentarios={(postId) =>
                    abrirComentariosNotificacao(postId, 'salvos')
                }

            />

        );

    }


    // Notificações
    else if (tela === 'notificacoes') {

        conteudo = (

            <NotificacoesScreen
                onAbrirPerfil={(userId) =>
                    abrirPerfilNotificacao(userId, 'notificacoes')
                }

                onVoltar={() => setTela('feed')}

                onAbrirPublicacao={abrirPublicacaoNotificacao}

                onAbrirComentarios={(postId) =>
                    abrirComentariosNotificacao(postId, 'notificacoes')
                }

                onAbrirChat={abrirChat}
            />

        );

    }


    // Chat em grupo
    else if (tela === 'chatGrupo' && grupoSelecionado) {

        conteudo = (

            <GroupChatScreen
                grupo={grupoSelecionado}
                onVoltar={() => {
                    setTela('conversas');
                    setGrupoSelecionado(null);
                }}
            />

        );

    }


    // Chat individual
    else if (
        tela === 'chat' &&
        conversaSelecionada &&
        perfilChat
    ) {

        conteudo = (

            <ChatScreen
                conversa={conversaSelecionada}
                perfil={perfilChat}
                onVoltar={() => {

                    setTela('conversas');

                    carregarMensagensNaoLidas();

                }}
            />

        );

    }


    // Perfil
    else if (tela === 'perfil' && usuarioSelecionado) {

        conteudo = (

            <PerfilScreen
                userId={usuarioSelecionado}

                onVoltar={() => {

                    setUsuarioSelecionado(null);

                    setPerfilSelecionado(null);

                    setTela(telaAnteriorPerfil);

                }}

                onEditar={(perfil) => {

                    setPerfilSelecionado(perfil);

                    setTela('editarPerfil');

                }}

                onMensagem={() => abrirChat(usuarioSelecionado)}

                onAbrirSalvos={() => setTela('salvos')}
            />

        );

    }


    // Feed
    else {

        conteudo = (

            <FeedScreen
                onLogout={handleLogout}

                onCriarPublicacao={() => setTela('criar')}

                onAbrirConversas={() => setTela('conversas')}

                onAbrirNotificacoes={abrirNotificacoes}

                notificacoesNaoLidas={notificacoesNaoLidas}

                onAbrirComentarios={(publicacao) => {

                    setPublicacaoSelecionada(publicacao);

                    setTelaAnteriorComentarios('feed');

                    setTela('comentarios');

                }}

                onAbrirPerfil={(userId) => {

                    setUsuarioSelecionado(userId);

                    setPerfilSelecionado(null);

                    setTelaAnteriorPerfil('feed');

                    setTela('perfil');

                }}

                publicacaoParaAbrirId={publicacaoParaAbrirId}

                onPublicacaoAberta={() => {
                    setPublicacaoParaAbrirId(null);
                }}

                mostrarNavegacao={false}
            />

        );

    }


    return (

        <View style={styles.container}>

            <View style={styles.conteudo}>
                {conteudo}
            </View>


            {/* NAVEGAÇÃO INFERIOR */}

            {mostrarNavegacao && (

                <View style={styles.bottomBar}>


                    {/* INÍCIO */}

                    <BotaoNav
                        onPress={() => setTela('feed')}
                        estilo={styles.itemNav}
                    >

                        <Image
                            source={ICONES.inicio}
                            style={styles.navIcon}
                            resizeMode="contain"
                        />

                        <Text style={[
                            styles.navLabel,
                            tela === 'feed' && styles.labelAtivo
                        ]}>
                            Início
                        </Text>

                    </BotaoNav>


                    {/* IDEIAS */}

                    <BotaoNav
                        onPress={() => setTela('ideias')}
                        estilo={styles.itemNav}
                    >

                        <Text style={[
                            styles.iconePesquisa,
                            tela === 'ideias' && styles.labelAtivo
                        ]}>
                            ◇
                        </Text>

                        <Text style={[
                            styles.navLabel,
                            tela === 'ideias' && styles.labelAtivo
                        ]}>
                            Ideias
                        </Text>

                    </BotaoNav>


                    {/* CHATS */}

                    <BotaoNav
                        onPress={() => {

                            carregarMensagensNaoLidas();

                            setTela('conversas');

                        }}
                        estilo={styles.itemNav}
                    >

                        <View style={styles.containerIcone}>

                            <Image
                                source={ICONES.mensagens}
                                style={styles.navIcon}
                                resizeMode="contain"
                            />

                            {mensagensNaoLidas > 0 && (

                                <View style={styles.contador}>

                                    <Text style={styles.contadorTexto}>
                                        {mensagensNaoLidas > 99
                                            ? '99+'
                                            : mensagensNaoLidas}
                                    </Text>

                                </View>

                            )}

                        </View>

                        <Text style={[
                            styles.navLabel,
                            tela === 'conversas' && styles.labelAtivo
                        ]}>
                            Chats
                        </Text>

                    </BotaoNav>


                    {/* CRIAR PUBLICAÇÃO */}

                    <BotaoNav
                        onPress={() => setTela('criar')}
                        estilo={styles.botaoCriar}
                    >

                        <Text style={styles.iconeCriar}>
                            ＋
                        </Text>

                    </BotaoNav>


                    {/* PESQUISA */}

                    <BotaoNav
                        onPress={() => setTela('pesquisa')}
                        estilo={styles.itemNav}
                    >

                        <Text style={[
                            styles.iconePesquisa,
                            tela === 'pesquisa' && styles.labelAtivo
                        ]}>
                            ⌕
                        </Text>

                        <Text style={[
                            styles.navLabel,
                            tela === 'pesquisa' && styles.labelAtivo
                        ]}>
                            Pesquisar
                        </Text>

                    </BotaoNav>


                    {/* PERFIL */}

                    <BotaoNav
                        onPress={() => {

                            setUsuarioSelecionado(user?.id);

                            setPerfilSelecionado(null);

                            setTelaAnteriorPerfil('feed');

                            setTela('perfil');

                        }}
                        estilo={styles.itemNav}
                    >

                        <Image
                            source={ICONES.perfil}
                            style={styles.navIcon}
                            resizeMode="contain"
                        />

                        <Text style={[
                            styles.navLabel,
                            tela === 'perfil' && styles.labelAtivo
                        ]}>
                            Perfil
                        </Text>

                    </BotaoNav>

                </View>

            )}

        </View>

    );

}


// ESTILOS

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: CORES.fundo
    },

    conteudo: {
        flex: 1
    },


    // Barra inferior

    bottomBar: {
        position: 'absolute',
        bottom: 15,
        left: 12,
        right: 12,
        height: 72,
        paddingHorizontal: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: CORES.barra,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: CORES.borda,
        elevation: 12,
        shadowColor: '#000000',
        shadowOffset: {
            width: 0,
            height: 5
        },
        shadowOpacity: 0.3,
        shadowRadius: 12
    },

    itemNav: {
        flex: 1
    },

    navButton: {
        height: 55,
        alignItems: 'center',
        justifyContent: 'center'
    },

    navIcon: {
        width: 21,
        height: 21
    },

    navLabel: {
        fontSize: 8,
        color: CORES.secundario,
        marginTop: 3,
        textAlign: 'center'
    },

    labelAtivo: {
        color: CORES.destaque,
        fontWeight: '700'
    },


    // Ícone de pesquisa

    iconePesquisa: {
        fontSize: 27,
        lineHeight: 29,
        color: CORES.secundario
    },


    // Container do ícone e contador

    containerIcone: {
        position: 'relative'
    },


    // Botão central

    botaoCriar: {
        width: 44,
        height: 44,
        borderRadius: 15,
        backgroundColor: CORES.destaque,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 5
    },

    iconeCriar: {
        color: CORES.fundo,
        fontSize: 29,
        lineHeight: 34
    },


    // Contador de mensagens

    contador: {
        position: 'absolute',
        top: -5,
        right: -15,
        minWidth: 17,
        height: 17,
        paddingHorizontal: 4,
        borderRadius: 9,
        backgroundColor: CORES.destaque,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: CORES.barra
    },

    contadorTexto: {
        color: CORES.fundo,
        fontSize: 9,
        fontWeight: '800'
    }

});