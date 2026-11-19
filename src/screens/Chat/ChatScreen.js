import React, { useEffect, useState, useRef } from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Image,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';

import {
    buscarMensagens,
    enviarMensagem,
    ouvirMensagens,
    pararDeOuvirMensagens,
    marcarMensagensComoLidas
} from '../../services/chat';

import { supabase } from '../../services/supabase';


const CORES = {
    fundo: '#0B0910',
    cartao: '#17141E',
    cartaoSecundario: '#211B2B',
    destaque: '#B66AE8',
    destaqueEscuro: '#8F4FC0',
    texto: '#F2EFF7',
    secundario: '#91899D',
    borda: '#292431',
    mensagemRecebida: '#211B2B',
    mensagemEnviada: '#B66AE8'
};


export default function ChatScreen({
    conversa,
    perfil,
    onVoltar
}) {

    const [mensagens, setMensagens] = useState([]);
    const [texto, setTexto] = useState('');
    const [usuarioId, setUsuarioId] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [enviando, setEnviando] = useState(false);

    const listaRef = useRef(null);


    // Adicionar mensagem sem duplicar
    function adicionarMensagem(novaMensagem) {

        setMensagens((atuais) => {

            const jaExiste = atuais.some(
                (mensagem) => mensagem.id === novaMensagem.id
            );

            if (jaExiste) {
                return atuais;
            }

            return [...atuais, novaMensagem];

        });

    }


    // Marcar mensagens recebidas como lidas
    async function atualizarLeitura() {

        try {

            await marcarMensagensComoLidas(conversa.id);

        } catch (error) {

            console.log(
                'Erro ao marcar mensagens como lidas:',
                error
            );

        }

    }


    // Carregar mensagens e iniciar tempo real
    useEffect(() => {

        let canal;
        let ativo = true;

        async function iniciarChat() {

            try {

                setCarregando(true);

                const {
                    data: { user },
                    error
                } = await supabase.auth.getUser();

                if (error) {
                    throw error;
                }

                if (!user) {
                    throw new Error('Usuário não conectado.');
                }

                if (!ativo) {
                    return;
                }

                setUsuarioId(user.id);

                const historico = await buscarMensagens(conversa.id);

                if (!ativo) {
                    return;
                }

                setMensagens(historico);

                await atualizarLeitura();

                if (!ativo) {
                    return;
                }

                canal = ouvirMensagens(
                    conversa.id,
                    (novaMensagem) => {

                        if (ativo) {

                            adicionarMensagem(novaMensagem);

                            if (novaMensagem.sender_id !== user.id) {
                                atualizarLeitura();
                            }

                        }

                    }
                );

            } catch (error) {

                console.log('Erro ao abrir conversa:', error);

            } finally {

                if (ativo) {
                    setCarregando(false);
                }

            }

        }

        iniciarChat();

        return () => {

            ativo = false;

            pararDeOuvirMensagens(canal);

        };

    }, [conversa.id]);


    // Enviar mensagem
    async function handleEnviarMensagem() {

        const conteudo = texto.trim();

        if (!conteudo || enviando) {
            return;
        }

        try {

            setEnviando(true);
            setTexto('');

            const mensagem = await enviarMensagem(
                conversa.id,
                conteudo
            );

            if (mensagem) {
                adicionarMensagem(mensagem);
            }

        } catch (error) {

            console.log('Erro ao enviar mensagem:', error);

            setTexto(conteudo);

        } finally {

            setEnviando(false);

        }

    }


    // Formatar horário
    function formatarHorario(data) {

        return new Date(data).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });

    }


    // Renderizar mensagem
    function renderizarMensagem({ item }) {

        const minhaMensagem = item.sender_id === usuarioId;

        return (

            <View
                style={[
                    styles.linhaMensagem,
                    minhaMensagem
                        ? styles.linhaMinha
                        : styles.linhaOutro
                ]}
            >

                <View
                    style={[
                        styles.balao,
                        minhaMensagem
                            ? styles.balaoMeu
                            : styles.balaoOutro
                    ]}
                >

                    <Text
                        style={[
                            styles.textoMensagem,
                            minhaMensagem
                                ? styles.textoMeu
                                : styles.textoOutro
                        ]}
                    >
                        {item.content}
                    </Text>

                    <Text
                        style={[
                            styles.horarioMensagem,
                            minhaMensagem
                                ? styles.horarioMeu
                                : styles.horarioOutro
                        ]}
                    >
                        {formatarHorario(item.created_at)}
                    </Text>

                </View>

            </View>

        );

    }


    return (

            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >

            {/* CABEÇALHO */}

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


                {perfil.avatar_url ? (

                    <Image
                        source={{ uri: perfil.avatar_url }}
                        style={styles.avatar}
                    />

                ) : (

                    <View style={styles.avatarPadrao}>

                        <Text style={styles.avatarTexto}>
                            {perfil.username?.charAt(0)?.toUpperCase() || '?'}
                        </Text>

                    </View>

                )}


                <View style={styles.infoPerfil}>

                    <Text style={styles.nome} numberOfLines={1}>
                        {perfil.full_name || perfil.username}
                    </Text>

                    <Text style={styles.username}>
                        @{perfil.username}
                    </Text>

                </View>

                <View style={styles.indicadorHeader} />

            </View>


            {/* MENSAGENS */}

            {carregando ? (

                <View style={styles.loadingContainer}>

                    <ActivityIndicator
                        size="large"
                        color={CORES.destaque}
                    />

                    <Text style={styles.loadingTexto}>
                        Carregando mensagens...
                    </Text>

                </View>

            ) : (

                <FlatList
                    ref={listaRef}
                    data={mensagens}
                    keyExtractor={(item) => item.id}
                    renderItem={renderizarMensagem}
                    contentContainerStyle={styles.listaMensagens}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => {
                        listaRef.current?.scrollToEnd({
                            animated: true
                        });
                    }}
                    ListEmptyComponent={

                        <View style={styles.vazio}>

                            <View style={styles.vazioIcone}>
                                <Text style={styles.vazioIconeTexto}>
                                    ✉
                                </Text>
                            </View>

                            <Text style={styles.vazioTexto}>
                                Esta é sua conversa com {perfil.username}.
                            </Text>

                            <Text style={styles.vazioSubtexto}>
                                Envie uma mensagem para começar!
                            </Text>

                        </View>

                    }
                />

            )}


            {/* CAMPO DE ENVIO */}

            <View style={styles.areaEnvio}>

                <TextInput
                    style={styles.input}
                    placeholder="Digite uma mensagem..."
                    placeholderTextColor={CORES.secundario}
                    value={texto}
                    onChangeText={setTexto}
                    multiline
                    maxLength={2000}
                />

                <TouchableOpacity
                    style={[
                        styles.botaoEnviar,
                        (!texto.trim() || enviando) && styles.botaoDesativado
                    ]}
                    onPress={handleEnviarMensagem}
                    disabled={!texto.trim() || enviando}
                    activeOpacity={0.8}
                >

                    {enviando ? (

                        <ActivityIndicator color="#FFFFFF" />
                        

                    ) : (

                        <Text style={styles.textoEnviar}>
                            ➤
                        </Text>

                    )}

                </TouchableOpacity>

            </View>

        </KeyboardAvoidingView>

    );

}


const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: CORES.fundo
    },

    // Cabeçalho
    header: {
        height: 78,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        backgroundColor: CORES.fundo,
        borderBottomWidth: 1,
        borderBottomColor: CORES.borda
    },

    botaoVoltar: {
        width: 40,
        height: 40,
        borderRadius: 13,
        backgroundColor: CORES.cartao,
        borderWidth: 1,
        borderColor: CORES.borda,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 13
    },

    textoVoltar: {
        fontSize: 34,
        color: CORES.texto,
        lineHeight: 38
    },

    avatar: {
        width: 45,
        height: 45,
        borderRadius: 16,
        backgroundColor: CORES.cartaoSecundario
    },

    avatarPadrao: {
        width: 45,
        height: 45,
        borderRadius: 16,
        backgroundColor: CORES.cartaoSecundario,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: CORES.borda
    },

    avatarTexto: {
        fontSize: 18,
        fontWeight: '800',
        color: CORES.destaque
    },

    infoPerfil: {
        flex: 1,
        marginLeft: 12
    },

    nome: {
        fontSize: 15,
        fontWeight: '800',
        color: CORES.texto
    },

    username: {
        fontSize: 12,
        color: CORES.secundario,
        marginTop: 3
    },

    indicadorHeader: {
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: CORES.destaque,
        marginLeft: 10
    },

    // Lista de mensagens
    listaMensagens: {
        paddingHorizontal: 16,
        paddingVertical: 20,
        flexGrow: 1,
        justifyContent: 'flex-end'
    },

    linhaMensagem: {
        flexDirection: 'row',
        marginBottom: 13
    },

    linhaMinha: {
        justifyContent: 'flex-end'
    },

    linhaOutro: {
        justifyContent: 'flex-start'
    },

    balao: {
        maxWidth: '82%',
        paddingHorizontal: 15,
        paddingVertical: 11,
        borderRadius: 18
    },

    balaoMeu: {
        backgroundColor: CORES.mensagemEnviada,
        borderBottomRightRadius: 5
    },

    balaoOutro: {
        backgroundColor: CORES.mensagemRecebida,
        borderBottomLeftRadius: 5,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    textoMensagem: {
        fontSize: 14,
        lineHeight: 21
    },

    textoMeu: {
        color: '#FFFFFF'
    },

    textoOutro: {
        color: CORES.texto
    },

    horarioMensagem: {
        fontSize: 10,
        marginTop: 6,
        textAlign: 'right'
    },

    horarioMeu: {
        color: '#EBD8F8'
    },

    horarioOutro: {
        color: CORES.secundario
    },

    // Estado vazio
    vazio: {
        alignItems: 'center',
        paddingHorizontal: 30,
        marginVertical: 30
    },

    vazioIcone: {
        width: 65,
        height: 65,
        borderRadius: 22,
        backgroundColor: CORES.cartaoSecundario,
        borderWidth: 1,
        borderColor: CORES.borda,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18
    },

    vazioIconeTexto: {
        fontSize: 29,
        color: CORES.destaque
    },

    vazioTexto: {
        fontSize: 15,
        fontWeight: '700',
        color: CORES.texto,
        textAlign: 'center'
    },

    vazioSubtexto: {
        fontSize: 13,
        color: CORES.secundario,
        marginTop: 7,
        textAlign: 'center',
        lineHeight: 20
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

    // Área de envio
    areaEnvio: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: CORES.borda,
        backgroundColor: CORES.fundo
    },

    input: {
        flex: 1,
        minHeight: 45,
        maxHeight: 110,
        backgroundColor: CORES.cartao,
        borderWidth: 1,
        borderColor: CORES.borda,
        borderRadius: 17,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 14,
        color: CORES.texto
    },

    botaoEnviar: {
        width: 45,
        height: 45,
        borderRadius: 16,
        backgroundColor: CORES.destaque,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 9
    },

    botaoDesativado: {
        opacity: 0.4
    },

    textoEnviar: {
        color: '#FFFFFF',
        fontSize: 19,
        fontWeight: '800'
    }

});