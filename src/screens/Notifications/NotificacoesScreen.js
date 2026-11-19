import React, { useEffect, useState } from 'react';

import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    Alert,
    ScrollView
} from 'react-native';

import {
    buscarNotificacoes,
    marcarNotificacaoComoLida,
    marcarTodasComoLidas
} from '../../services/notifications';

import { buscarPerfil } from '../../services/profiles';

import { supabase } from '../../services/supabase';


const CORES = {
    fundo: '#0B0910',
    card: '#17141E',
    cardSecundario: '#211B2B',
    destaque: '#B66AE8',
    texto: '#F2EFF7',
    secundario: '#91899D',
    borda: '#292431'
};


const ABAS = [
    {
        id: 'todas',
        titulo: 'Todas'
    },
    {
        id: 'interacoes',
        titulo: 'Curtidas e comentários'
    },
    {
        id: 'seguidores',
        titulo: 'Seguidores'
    },
    {
        id: 'visitas',
        titulo: 'Visitas ao perfil'
    }
];


export default function NotificacoesScreen({
    onVoltar,
    onAbrirPerfil,
    onAbrirPublicacao,
    onAbrirComentarios,
    onAbrirChat
}) {

    const [notificacoes, setNotificacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [perfis, setPerfis] = useState({});
    const [marcandoTodas, setMarcandoTodas] = useState(false);

    const [abaSelecionada, setAbaSelecionada] = useState('todas');


    // Buscar notificações
    async function carregarNotificacoes() {

        try {

            const dados = await buscarNotificacoes();

            setNotificacoes(dados);

            const ids = [
                ...new Set(
                    dados
                        .map(item => item.sender_id)
                        .filter(Boolean)
                )
            ];

            const resultados = await Promise.all(
                ids.map(async id => {

                    try {

                        const perfil = await buscarPerfil(id);

                        return [id, perfil];

                    } catch (error) {

                        console.log('Erro ao buscar perfil:', error);

                        return [id, null];

                    }

                })
            );

            const mapa = {};

            resultados.forEach(([id, perfil]) => {
                mapa[id] = perfil;
            });

            setPerfis(mapa);

        } catch (error) {

            console.log('Erro ao carregar notificações:', error);

            Alert.alert(
                'Erro',
                'Não foi possível carregar as notificações.'
            );

        } finally {

            setLoading(false);

        }

    }


    // Atualização em tempo real
    useEffect(() => {

        carregarNotificacoes();

        const canal = supabase
            .channel('notificacoes-tela')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications'
                },
                () => {
                    carregarNotificacoes();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(canal);
        };

    }, []);


    // Filtrar notificações conforme a aba
    const notificacoesFiltradas = notificacoes.filter(item => {

        switch (abaSelecionada) {

            case 'interacoes':

                return (
                    item.type === 'like' ||
                    item.type === 'comment'
                );


            case 'seguidores':

                return item.type === 'follow';


            case 'visitas':

                return (
                    item.type === 'profile_visit' ||
                    item.type === 'visit'
                );


            case 'todas':
            default:

                return true;

        }

    });


    // Marcar notificação como lida e abrir destino
    async function handleAbrirNotificacao(item) {

        try {

            if (!item.is_read) {

                await marcarNotificacaoComoLida(item.id);

                setNotificacoes(atual =>
                    atual.map(notificacao =>
                        notificacao.id === item.id
                            ? { ...notificacao, is_read: true }
                            : notificacao
                    )
                );

            }

            switch (item.type) {

                // Curtida: abrir publicação
                case 'like':

                    if (item.post_id && onAbrirPublicacao) {
                        onAbrirPublicacao(item.post_id);
                    }

                    break;


                // Comentário: abrir comentários
                case 'comment':

                    if (item.post_id && onAbrirComentarios) {
                        onAbrirComentarios(item.post_id);
                    }

                    break;


                // Novo seguidor: abrir perfil
                case 'follow':

                // Visita ao perfil: abrir perfil
                case 'profile_visit':
                case 'visit':

                    if (item.sender_id && onAbrirPerfil) {
                        onAbrirPerfil(item.sender_id);
                    }

                    break;


                // Mensagem: abrir conversa
                case 'message':

                    if (item.sender_id && onAbrirChat) {
                        onAbrirChat(item.sender_id);
                    }

                    break;


                default:

                    console.log(
                        'Tipo de notificação desconhecido:',
                        item.type
                    );

                    break;

            }

        } catch (error) {

            console.log('Erro ao abrir notificação:', error);

            Alert.alert(
                'Erro',
                'Não foi possível abrir esta notificação.'
            );

        }

    }


    // Marcar todas como lidas
    async function handleMarcarTodas() {

        if (marcandoTodas) return;

        try {

            setMarcandoTodas(true);

            await marcarTodasComoLidas();

            setNotificacoes(atual =>
                atual.map(item => ({
                    ...item,
                    is_read: true
                }))
            );

        } catch (error) {

            Alert.alert(
                'Erro',
                'Não foi possível marcar as notificações como lidas.'
            );

            console.log(error);

        } finally {

            setMarcandoTodas(false);

        }

    }


    // Data da notificação
    function formatarData(data) {

        const agora = new Date();
        const dataNotificacao = new Date(data);

        const diferenca = agora - dataNotificacao;

        const minutos = Math.floor(diferenca / 60000);

        if (minutos < 1) return 'Agora';

        if (minutos < 60) {
            return `Há ${minutos} min`;
        }

        const horas = Math.floor(minutos / 60);

        if (horas < 24) {
            return `Há ${horas} h`;
        }

        const dias = Math.floor(horas / 24);

        if (dias < 7) {
            return `Há ${dias} dias`;
        }

        return dataNotificacao.toLocaleDateString('pt-BR');

    }


    // Renderizar notificação
    function renderNotificacao({ item }) {

        const perfil = perfis[item.sender_id];

        const nome = perfil?.username
            ? `@${perfil.username}`
            : perfil?.full_name || 'Alguém';

        return (

            <TouchableOpacity
                style={[
                    styles.notificacao,
                    !item.is_read && styles.naoLida
                ]}
                onPress={() => handleAbrirNotificacao(item)}
                activeOpacity={0.8}
            >

                {perfil?.avatar_url ? (

                    <Image
                        source={{ uri: perfil.avatar_url }}
                        style={styles.avatar}
                    />

                ) : (

                    <View style={styles.avatarPadrao}>

                        <Text style={styles.avatarTexto}>
                            {nome.charAt(0).toUpperCase()}
                        </Text>

                    </View>

                )}


                <View style={styles.conteudoNotificacao}>

                    <Text style={styles.mensagem}>

                        <Text style={styles.nome}>
                            {nome}
                        </Text>

                        {' '}

                        {item.message}

                    </Text>

                    <Text style={styles.data}>
                        {formatarData(item.created_at)}
                    </Text>

                </View>


                {!item.is_read && (
                    <View style={styles.pontoNaoLido} />
                )}

            </TouchableOpacity>

        );

    }


    return (

        <View style={styles.container}>

            {/* Cabeçalho */}

            <View style={styles.header}>

                <View style={styles.headerEsquerda}>

                    <TouchableOpacity
                        style={styles.botaoVoltar}
                        onPress={onVoltar}
                        activeOpacity={0.7}
                    >

                        <Text style={styles.iconeVoltar}>
                            ‹
                        </Text>

                    </TouchableOpacity>

                    <Text style={styles.titulo}>
                        Notificações
                    </Text>

                </View>


                {notificacoes.some(item => !item.is_read) && (

                    <TouchableOpacity
                        onPress={handleMarcarTodas}
                        disabled={marcandoTodas}
                    >

                        <Text style={styles.marcarTodas}>
                            {marcandoTodas
                                ? 'Aguarde...'
                                : 'Marcar todas'}
                        </Text>

                    </TouchableOpacity>

                )}

            </View>


            {/* Abas */}

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.abasContainer}
            >

                {ABAS.map(aba => (

                    <TouchableOpacity
                        key={aba.id}
                        style={[
                            styles.aba,
                            abaSelecionada === aba.id && styles.abaSelecionada
                        ]}
                        onPress={() => setAbaSelecionada(aba.id)}
                        activeOpacity={0.8}
                    >

                        <Text
                            style={[
                                styles.abaTexto,
                                abaSelecionada === aba.id && styles.abaTextoSelecionado
                            ]}
                        >
                            {aba.titulo}
                        </Text>

                    </TouchableOpacity>

                ))}

            </ScrollView>


            {/* Lista de notificações */}

            {loading ? (

                <ActivityIndicator
                    size="large"
                    color={CORES.destaque}
                    style={styles.loading}
                />

            ) : (

                <FlatList
                    data={notificacoesFiltradas}
                    keyExtractor={item => item.id}
                    renderItem={renderNotificacao}
                    contentContainerStyle={styles.lista}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={

                        <View style={styles.vazio}>

                            <Text style={styles.vazioIcone}>
                                ◇
                            </Text>

                            <Text style={styles.vazioTitulo}>
                                {abaSelecionada === 'visitas'
                                    ? 'Nenhuma visita por enquanto'
                                    : 'Tudo tranquilo por aqui'}
                            </Text>

                            <Text style={styles.vazioTexto}>
                                {abaSelecionada === 'visitas'
                                    ? 'Quando alguém visitar seu perfil, a notificação aparecerá aqui.'
                                    : 'Quando alguém interagir com você, suas notificações aparecerão aqui.'}
                            </Text>

                        </View>

                    }
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

    // Cabeçalho
    header: {
        paddingHorizontal: 20,
        paddingTop: 55,
        paddingBottom: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },

    headerEsquerda: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },

    botaoVoltar: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: CORES.card,
        borderWidth: 1,
        borderColor: CORES.borda,
        alignItems: 'center',
        justifyContent: 'center'
    },

    iconeVoltar: {
        color: CORES.texto,
        fontSize: 32,
        lineHeight: 35,
        marginTop: -4
    },

    titulo: {
        color: CORES.texto,
        fontSize: 25,
        fontWeight: '800'
    },

    marcarTodas: {
        color: CORES.destaque,
        fontSize: 11,
        fontWeight: '600'
    },

    // Abas
    abasContainer: {
        paddingHorizontal: 18,
        paddingBottom: 17,
        gap: 8
    },

    aba: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: CORES.card,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    abaSelecionada: {
        backgroundColor: '#30213D',
        borderColor: CORES.destaque
    },

    abaTexto: {
        color: CORES.secundario,
        fontSize: 11,
        fontWeight: '600'
    },

    abaTextoSelecionado: {
        color: CORES.destaque,
        fontWeight: '800'
    },

    // Lista
    lista: {
        paddingHorizontal: 16,
        paddingBottom: 600,
    },

    notificacao: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CORES.card,
        borderRadius: 17,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    naoLida: {
        borderColor: '#684080',
        backgroundColor: '#1D1725'
    },

    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: CORES.borda
    },

    avatarPadrao: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#30243B',
        alignItems: 'center',
        justifyContent: 'center'
    },

    avatarTexto: {
        color: CORES.destaque,
        fontSize: 18,
        fontWeight: '800'
    },

    conteudoNotificacao: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8
    },

    mensagem: {
        color: CORES.texto,
        fontSize: 13,
        lineHeight: 19
    },

    nome: {
        fontWeight: '800',
        color: CORES.texto
    },

    data: {
        color: CORES.secundario,
        fontSize: 10,
        marginTop: 6
    },

    pontoNaoLido: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: CORES.destaque
    },

    loading: {
        marginTop: 60
    },

    // Estado vazio
    vazio: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 35,
        paddingVertical: 70
    },

    vazioIcone: {
        color: CORES.destaque,
        fontSize: 35,
        marginBottom: 15
    },

    vazioTitulo: {
        color: CORES.texto,
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center'
    },

    vazioTexto: {
        color: CORES.secundario,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20
    }

});