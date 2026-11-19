import React, { useEffect, useState } from 'react';

import {
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator
} from 'react-native';

import {
    buscarConversas,
    buscarMensagens,
    contarMensagensNaoLidas
} from '../../services/chat';

import {
    buscarPerfil
} from '../../services/profiles';

import { supabase } from '../../services/supabase';


// Paleta visual
const CORES = {
    fundo: '#0B0910',
    cartao: '#17141E',
    cartaoSecundario: '#211B2B',
    destaque: '#B66AE8',
    texto: '#F2EFF7',
    secundario: '#91899D',
    borda: '#292431',
    vermelho: '#D96B87'
};


export default function ConversasScreen({
    onVoltar,
    onAbrirConversa
}) {

    const [conversas, setConversas] = useState([]);
    const [carregando, setCarregando] = useState(true);


    // Formatar horário
    function formatarHorario(data) {

        if (!data) return '';

        const dataMensagem = new Date(data);
        const hoje = new Date();

        const mesmaData =
            dataMensagem.toDateString() === hoje.toDateString();

        if (mesmaData) {

            return dataMensagem.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });

        }

        return dataMensagem.toLocaleDateString('pt-BR');

    }


    // Carregar conversas
    async function carregarConversas(mostrarLoading = true) {

        try {

            if (mostrarLoading) {
                setCarregando(true);
            }

            const {
                data: { user },
                error
            } = await supabase.auth.getUser();

            if (error) throw error;

            if (!user) {
                throw new Error('Usuário não conectado.');
            }

            const lista = await buscarConversas();

            const conversasDetalhadas = await Promise.all(

                lista.map(async (conversa) => {

                    const outroUsuarioId =
                        conversa.user1_id === user.id
                            ? conversa.user2_id
                            : conversa.user1_id;

                    const [
                        perfil,
                        mensagens,
                        naoLidas
                    ] = await Promise.all([

                        buscarPerfil(outroUsuarioId),
                        buscarMensagens(conversa.id),
                        contarMensagensNaoLidas(conversa.id)

                    ]);

                    const ultimaMensagem =
                        mensagens.length > 0
                            ? mensagens[mensagens.length - 1]
                            : null;

                    return {
                        ...conversa,
                        perfil,
                        ultimaMensagem,
                        naoLidas
                    };

                })

            );


            // Ordenar pela mensagem mais recente
            conversasDetalhadas.sort((a, b) => {

                const dataA = a.ultimaMensagem?.created_at || a.created_at;
                const dataB = b.ultimaMensagem?.created_at || b.created_at;

                return new Date(dataB) - new Date(dataA);

            });

            setConversas(conversasDetalhadas);

        } catch (error) {

            console.log('Erro ao carregar conversas:', error);

        } finally {

            if (mostrarLoading) {
                setCarregando(false);
            }

        }

    }


    // Carregar conversas e ouvir novas mensagens
    useEffect(() => {

        carregarConversas();

        const canal = supabase
            .channel('conversas-novas-mensagens')

            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                () => {
                    carregarConversas(false);
                }
            )

            .subscribe();


        return () => {
            supabase.removeChannel(canal);
        };

    }, []);


    // Renderizar conversa
    function renderizarConversa({ item }) {

        const nome =
            item.perfil?.full_name ||
            item.perfil?.username ||
            'Usuário';

        const username =
            item.perfil?.username || 'usuario';

        return (

            <TouchableOpacity
                style={[
                    styles.conversa,
                    item.naoLidas > 0 && styles.conversaNaoLida
                ]}
                activeOpacity={0.75}
                onPress={() => onAbrirConversa(item, item.perfil)}
            >

                {/* Avatar */}

                <View style={styles.avatarContainer}>

                    {item.perfil?.avatar_url ? (

                        <Image
                            source={{ uri: item.perfil.avatar_url }}
                            style={styles.avatar}
                        />

                    ) : (

                        <View style={styles.avatarPadrao}>

                            <Text style={styles.avatarTexto}>
                                {nome.charAt(0).toUpperCase()}
                            </Text>

                        </View>

                    )}

                    {item.naoLidas > 0 && (
                        <View style={styles.pontoNaoLido} />
                    )}

                </View>


                {/* Informações */}

                <View style={styles.conteudo}>

                    <View style={styles.linhaSuperior}>

                        <Text
                            style={styles.nome}
                            numberOfLines={1}
                        >
                            {nome}
                        </Text>

                        <Text style={styles.horario}>
                            {formatarHorario(item.ultimaMensagem?.created_at)}
                        </Text>

                    </View>


                    <Text style={styles.username}>
                        @{username}
                    </Text>


                    <View style={styles.linhaInferior}>

                        <Text
                            style={[
                                styles.ultimaMensagem,
                                item.naoLidas > 0 && styles.mensagemNaoLida
                            ]}
                            numberOfLines={1}
                        >
                            {item.ultimaMensagem
                                ? item.ultimaMensagem.content
                                : 'Inicie uma conversa'}
                        </Text>


                        {item.naoLidas > 0 && (

                            <View style={styles.contador}>

                                <Text style={styles.contadorTexto}>
                                    {item.naoLidas > 99
                                        ? '99+'
                                        : item.naoLidas}
                                </Text>

                            </View>

                        )}

                    </View>

                </View>


                <Text style={styles.seta}>
                    ›
                </Text>

            </TouchableOpacity>

        );

    }


    return (

        <View style={styles.container}>

            {/* Cabeçalho */}

            <View style={styles.header}>

                <TouchableOpacity
                    onPress={onVoltar}
                    style={styles.botaoVoltar}
                    activeOpacity={0.7}
                >

                    <Text style={styles.textoVoltar}>
                        ‹
                    </Text>

                </TouchableOpacity>


                <View style={styles.headerInfo}>

                    <Text style={styles.subtitulo}>
                        logo / CONEXÕES
                    </Text>

                    <Text style={styles.titulo}>
                        Mensagens
                    </Text>

                </View>


                <View style={styles.iconeHeader}>

                    <Text style={styles.iconeHeaderTexto}>
                        ✉
                    </Text>

                </View>

            </View>


            {/* Conteúdo */}

            {carregando ? (

                <View style={styles.loadingContainer}>

                    <ActivityIndicator
                        size="large"
                        color={CORES.destaque}
                    />

                    <Text style={styles.loadingTexto}>
                        Carregando conversas...
                    </Text>

                </View>

            ) : (

                <FlatList

                    data={conversas}

                    keyExtractor={(item) => String(item.id)}

                    renderItem={renderizarConversa}

                    showsVerticalScrollIndicator={false}

                    contentContainerStyle={
                        conversas.length === 0
                            ? styles.listaVazia
                            : styles.lista
                    }

                    refreshing={carregando}

                    onRefresh={() => carregarConversas()}

                    ListHeaderComponent={

                        conversas.length > 0 ? (

                            <View style={styles.listaHeader}>

                                <View>

                                    <Text style={styles.listaTitulo}>
                                        SUAS CONVERSAS
                                    </Text>

                                    <Text style={styles.listaSubtitulo}>
                                        Continue suas conversas
                                    </Text>

                                </View>

                                <View style={styles.quantidade}>

                                    <Text style={styles.quantidadeTexto}>
                                        {conversas.length}
                                    </Text>

                                </View>

                            </View>

                        ) : null

                    }

                    ListEmptyComponent={

                        <View style={styles.vazio}>

                            <View style={styles.vazioIcone}>

                                <Text style={styles.vazioIconeTexto}>
                                    ✉
                                </Text>

                            </View>

                            <Text style={styles.vazioTitulo}>
                                Nenhuma conversa ainda
                            </Text>

                            <Text style={styles.vazioTexto}>
                                Quando você conversar com alguém,
                                suas mensagens aparecerão aqui.
                            </Text>

                        </View>

                    }

                />

            )}

        </View>

    );

}


// Estilos
const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: CORES.fundo
    },

    // Cabeçalho
    header: {
        minHeight: 90,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: CORES.borda
    },

    botaoVoltar: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: CORES.cartao,
        borderWidth: 1,
        borderColor: CORES.borda,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14
    },

    textoVoltar: {
        fontSize: 34,
        lineHeight: 38,
        color: CORES.texto
    },

    headerInfo: {
        flex: 1
    },

    subtitulo: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1.8,
        color: CORES.destaque,
        marginBottom: 5
    },

    titulo: {
        fontSize: 23,
        fontWeight: '800',
        color: CORES.texto
    },

    iconeHeader: {
        width: 43,
        height: 43,
        borderRadius: 14,
        backgroundColor: CORES.cartaoSecundario,
        borderWidth: 1,
        borderColor: CORES.borda,
        justifyContent: 'center',
        alignItems: 'center'
    },

    iconeHeaderTexto: {
        fontSize: 20,
        color: CORES.destaque
    },

    // Lista
    lista: {
        paddingHorizontal: 17,
        paddingBottom: 120
    },

    listaHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 25,
        marginBottom: 17,
        paddingHorizontal: 3
    },

    listaTitulo: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        color: CORES.texto
    },

    listaSubtitulo: {
        fontSize: 11,
        color: CORES.secundario,
        marginTop: 5
    },

    quantidade: {
        minWidth: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: CORES.cartaoSecundario,
        borderWidth: 1,
        borderColor: CORES.borda,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8
    },

    quantidadeTexto: {
        fontSize: 11,
        fontWeight: '700',
        color: CORES.destaque
    },

    // Conversa
    conversa: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CORES.cartao,
        padding: 14,
        marginBottom: 11,
        borderRadius: 19,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    conversaNaoLida: {
        borderColor: CORES.destaque,
        backgroundColor: '#1C1724'
    },

    avatarContainer: {
        position: 'relative'
    },

    avatar: {
        width: 54,
        height: 54,
        borderRadius: 18,
        backgroundColor: CORES.cartaoSecundario
    },

    avatarPadrao: {
        width: 54,
        height: 54,
        borderRadius: 18,
        backgroundColor: CORES.cartaoSecundario,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: CORES.borda
    },

    avatarTexto: {
        fontSize: 21,
        fontWeight: '800',
        color: CORES.destaque
    },

    pontoNaoLido: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: CORES.destaque,
        bottom: -2,
        right: -2,
        borderWidth: 2,
        borderColor: CORES.cartao
    },

    conteudo: {
        flex: 1,
        marginLeft: 13
    },

    linhaSuperior: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },

    nome: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        color: CORES.texto,
        marginRight: 8
    },

    horario: {
        fontSize: 10,
        color: CORES.secundario
    },

    username: {
        fontSize: 11,
        color: CORES.secundario,
        marginTop: 4
    },

    linhaInferior: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8
    },

    ultimaMensagem: {
        flex: 1,
        fontSize: 12,
        color: CORES.secundario,
        marginRight: 8
    },

    mensagemNaoLida: {
        color: CORES.texto,
        fontWeight: '700'
    },

    contador: {
        minWidth: 21,
        height: 21,
        paddingHorizontal: 6,
        borderRadius: 11,
        backgroundColor: CORES.destaque,
        justifyContent: 'center',
        alignItems: 'center'
    },

    contadorTexto: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800'
    },

    seta: {
        fontSize: 25,
        color: CORES.secundario,
        marginLeft: 8
    },

    // Carregamento
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },

    loadingTexto: {
        color: CORES.secundario,
        fontSize: 12,
        marginTop: 13
    },

    // Estado vazio
    listaVazia: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 35,
        paddingBottom: 100
    },

    vazio: {
        alignItems: 'center'
    },

    vazioIcone: {
        width: 72,
        height: 72,
        borderRadius: 23,
        backgroundColor: CORES.cartaoSecundario,
        borderWidth: 1,
        borderColor: CORES.borda,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },

    vazioIconeTexto: {
        fontSize: 30,
        color: CORES.destaque
    },

    vazioTitulo: {
        fontSize: 17,
        fontWeight: '800',
        color: CORES.texto,
        textAlign: 'center'
    },

    vazioTexto: {
        fontSize: 12,
        color: CORES.secundario,
        textAlign: 'center',
        marginTop: 9,
        lineHeight: 20
    }

});