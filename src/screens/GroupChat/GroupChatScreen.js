import React, { useEffect, useState, useRef } from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
    Alert,
    Modal
} from 'react-native';

import { supabase } from '../../services/supabase';

import {
    buscarMensagensGrupo,
    buscarParticipantes,
    adicionarParticipante,
    enviarMensagemGrupo,
    ouvirMensagensGrupo,
    pararDeOuvirMensagensGrupo
} from '../../services/groupChat';

import {
    buscarPerfil,
    pesquisarUsuarios
} from '../../services/profiles';


export default function GroupChatScreen({ grupo, onVoltar }) {

    const [mensagens, setMensagens] = useState([]);
    const [texto, setTexto] = useState('');
    const [usuarioId, setUsuarioId] = useState(null);
    const [perfis, setPerfis] = useState({});
    const [participantes, setParticipantes] = useState([]);

    const [carregando, setCarregando] = useState(true);
    const [enviando, setEnviando] = useState(false);

    const [ehAdmin, setEhAdmin] = useState(false);

    // Adicionar participantes
    const [modalParticipantes, setModalParticipantes] = useState(false);
    const [termoBusca, setTermoBusca] = useState('');
    const [resultadosBusca, setResultadosBusca] = useState([]);
    const [pesquisando, setPesquisando] = useState(false);
    const [adicionandoId, setAdicionandoId] = useState(null);

    const requisicaoBusca = useRef(0);
    const listaRef = useRef(null);


    // Carregar mensagens
    async function carregarMensagens() {

        try {

            const dados = await buscarMensagensGrupo(grupo.id);

            setMensagens(dados || []);

        } catch (error) {

            console.log('Erro ao carregar mensagens do grupo:', error);

        } finally {

            setCarregando(false);

        }
    }


    // Carregar participantes e perfis
    async function carregarPerfis(idUsuario = usuarioId) {

        try {

            const dados = await buscarParticipantes(grupo.id);

            setParticipantes(dados || []);

            const administrador = dados?.some(
                participante =>
                    participante.user_id === idUsuario &&
                    participante.role === 'admin'
            );

            setEhAdmin(!!administrador);

            const novosPerfis = {};

            for (const participante of dados || []) {

                const perfil = await buscarPerfil(participante.user_id);

                if (perfil) {
                    novosPerfis[participante.user_id] = perfil;
                }
            }

            setPerfis(novosPerfis);

        } catch (error) {

            console.log('Erro ao carregar participantes:', error);

        }
    }


    // Inicialização e realtime
    useEffect(() => {

        let canal;

        async function iniciar() {

            const { data } = await supabase.auth.getUser();

            const idUsuario = data?.user?.id;

            if (idUsuario) {
                setUsuarioId(idUsuario);
            }

            await Promise.all([
                carregarMensagens(),
                carregarPerfis(idUsuario)
            ]);

            canal = ouvirMensagensGrupo(grupo.id, () => {
                carregarMensagens();
            });
        }

        iniciar();

        return () => {

            if (canal) {
                pararDeOuvirMensagensGrupo(canal);
            }

        };

    }, [grupo.id]);


    // Pesquisar usuários
    useEffect(() => {

        const termo = termoBusca.trim().replace(/^@/, '');

        if (!modalParticipantes || !termo) {

            setResultadosBusca([]);
            setPesquisando(false);

            return;
        }

        const numeroRequisicao = ++requisicaoBusca.current;

        const timeout = setTimeout(async () => {

            setPesquisando(true);

            try {

                const resultados = await pesquisarUsuarios(termo);

                if (numeroRequisicao !== requisicaoBusca.current) {
                    return;
                }

                const idsParticipantes = participantes.map(
                    participante => participante.user_id
                );

                const filtrados = resultados.filter(usuario => {

                    return (
                        usuario.id !== usuarioId &&
                        !idsParticipantes.includes(usuario.id)
                    );

                });

                setResultadosBusca(filtrados);

            } catch (error) {

                console.log('Erro ao pesquisar usuários:', error);

                if (numeroRequisicao === requisicaoBusca.current) {
                    setResultadosBusca([]);
                }

            } finally {

                if (numeroRequisicao === requisicaoBusca.current) {
                    setPesquisando(false);
                }

            }

        }, 400);

        return () => clearTimeout(timeout);

    }, [termoBusca, modalParticipantes, participantes, usuarioId]);


    // Abrir modal
    function abrirModalParticipantes() {

        setTermoBusca('');
        setResultadosBusca([]);
        setModalParticipantes(true);

    }


    // Adicionar participante
    async function adicionarUsuario(usuario) {

        if (adicionandoId) return;

        setAdicionandoId(usuario.id);

        try {

            await adicionarParticipante(grupo.id, usuario.id);

            await carregarPerfis(usuarioId);

            setResultadosBusca(resultados =>
                resultados.filter(item => item.id !== usuario.id)
            );

            Alert.alert(
                'Participante adicionado',
                `${usuario.full_name || usuario.username || 'Usuário'} foi adicionado ao grupo.`
            );

        } catch (error) {

            console.log('Erro ao adicionar participante:', error);

            Alert.alert(
                'Erro',
                error.message || 'Não foi possível adicionar este participante.'
            );

        } finally {

            setAdicionandoId(null);

        }
    }


    // Enviar mensagem
    async function enviar() {

        const conteudo = texto.trim();

        if (!conteudo || enviando) return;

        setEnviando(true);
        setTexto('');

        try {

            await enviarMensagemGrupo(grupo.id, conteudo);

            await carregarMensagens();

        } catch (error) {

            console.log('Erro ao enviar mensagem:', error);

            setTexto(conteudo);

            Alert.alert(
                'Erro',
                'Não foi possível enviar sua mensagem.'
            );

        } finally {

            setEnviando(false);

        }
    }


    // Formatar horário
    function formatarHorario(data) {

        if (!data) return '';

        return new Date(data).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }


    // Renderizar mensagem
    function renderizarMensagem({ item }) {

        const minhaMensagem = item.sender_id === usuarioId;

        const perfil = perfis[item.sender_id];

        return (

            <View
                style={[
                    styles.mensagemContainer,
                    minhaMensagem
                        ? styles.mensagemMinhaContainer
                        : styles.mensagemOutraContainer
                ]}
            >

                {!minhaMensagem && (

                    <View style={styles.remetenteContainer}>

                        {perfil?.avatar_url ? (

                            <Image
                                source={{ uri: perfil.avatar_url }}
                                style={styles.avatarMensagem}
                            />

                        ) : (

                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarPlaceholderTexto}>
                                    {(perfil?.full_name || perfil?.username || '?')[0].toUpperCase()}
                                </Text>
                            </View>

                        )}

                        <Text style={styles.nomeRemetente}>
                            {perfil?.full_name || perfil?.username || 'Usuário'}
                        </Text>

                    </View>

                )}

                <View
                    style={[
                        styles.balao,
                        minhaMensagem
                            ? styles.balaoMeu
                            : styles.balaoOutro
                    ]}
                >

                    <Text style={styles.textoMensagem}>
                        {item.content}
                    </Text>

                    <Text style={styles.horarioMensagem}>
                        {formatarHorario(item.created_at)}
                    </Text>

                </View>

            </View>

        );
    }


    // Renderizar usuário encontrado
    function renderizarUsuario({ item }) {

        const adicionando = adicionandoId === item.id;

        return (

            <View style={styles.usuarioItem}>

                {item.avatar_url ? (

                    <Image
                        source={{ uri: item.avatar_url }}
                        style={styles.avatarUsuario}
                    />

                ) : (

                    <View style={styles.avatarUsuarioPlaceholder}>
                        <Text style={styles.avatarUsuarioTexto}>
                            {(item.full_name || item.username || '?')[0].toUpperCase()}
                        </Text>
                    </View>

                )}

                <View style={styles.usuarioInfo}>

                    <Text style={styles.usuarioNome}>
                        {item.full_name || item.username || 'Usuário'}
                    </Text>

                    <Text style={styles.usuarioUsername}>
                        @{item.username || 'usuario'}
                    </Text>

                </View>

                <TouchableOpacity
                    style={styles.botaoAdicionar}
                    onPress={() => adicionarUsuario(item)}
                    disabled={!!adicionandoId}
                >

                    {adicionando ? (

                        <ActivityIndicator
                            size="small"
                            color="#FFFFFF"
                        />

                    ) : (

                        <Text style={styles.textoBotaoAdicionar}>
                            Adicionar
                        </Text>

                    )}

                </TouchableOpacity>

            </View>

        );
    }


    return (

        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >

            {/* Cabeçalho */}
            <View style={styles.header}>

                <TouchableOpacity
                    onPress={onVoltar}
                    style={styles.botaoVoltar}
                >
                    <Text style={styles.textoVoltar}>‹</Text>
                </TouchableOpacity>

                <View style={styles.headerInfo}>

                    <Text style={styles.nomeGrupo}>
                        {grupo.name}
                    </Text>

                    <Text style={styles.subtituloGrupo}>
                        {participantes.length} participantes
                    </Text>

                </View>

                {ehAdmin && (

                    <TouchableOpacity
                        style={styles.botaoParticipantes}
                        onPress={abrirModalParticipantes}
                    >

                        <Text style={styles.textoBotaoParticipantes}>
                            + Adicionar
                        </Text>

                    </TouchableOpacity>

                )}

            </View>


            {/* Mensagens */}
            {carregando ? (

                <View style={styles.carregandoContainer}>
                    <ActivityIndicator
                        size="large"
                        color="#B66AE8"
                    />
                </View>

            ) : (

                <FlatList
                    ref={listaRef}
                    data={mensagens}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderizarMensagem}
                    contentContainerStyle={styles.listaMensagens}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => {
                        listaRef.current?.scrollToEnd({
                            animated: true
                        });
                    }}
                    ListEmptyComponent={

                        <View style={styles.vazioContainer}>

                            <Text style={styles.vazioTitulo}>
                                Início da conversa
                            </Text>

                            <Text style={styles.vazioTexto}>
                                Envie a primeira mensagem do grupo.
                            </Text>

                        </View>

                    }
                />

            )}


            {/* Campo de mensagem */}
            <View style={styles.inputContainer}>

                <TextInput
                    style={styles.input}
                    placeholder="Mensagem..."
                    placeholderTextColor="#91899D"
                    value={texto}
                    onChangeText={setTexto}
                    multiline
                    maxLength={3000}
                />

                <TouchableOpacity
                    style={[
                        styles.botaoEnviar,
                        (!texto.trim() || enviando) && styles.botaoDesativado
                    ]}
                    onPress={enviar}
                    disabled={!texto.trim() || enviando}
                >

                    <Text style={styles.textoEnviar}>
                        ➤
                    </Text>

                </TouchableOpacity>

            </View>


            {/* Modal de participantes */}
            <Modal
                visible={modalParticipantes}
                animationType="slide"
                transparent
                onRequestClose={() => setModalParticipantes(false)}
            >

                <View style={styles.modalFundo}>

                    <View style={styles.modalContainer}>

                        <View style={styles.modalHeader}>

                            <View>
                                <Text style={styles.modalTitulo}>
                                    Adicionar participantes
                                </Text>

                                <Text style={styles.modalSubtitulo}>
                                    Pesquise pelo nome ou usuário.
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => setModalParticipantes(false)}
                                style={styles.botaoFechar}
                            >
                                <Text style={styles.textoFechar}>
                                    ×
                                </Text>
                            </TouchableOpacity>

                        </View>


                        <TextInput
                            style={styles.inputBusca}
                            placeholder="Pesquisar usuário..."
                            placeholderTextColor="#91899D"
                            value={termoBusca}
                            onChangeText={setTermoBusca}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />


                        {pesquisando ? (

                            <View style={styles.estadoBusca}>
                                <ActivityIndicator
                                    size="large"
                                    color="#B66AE8"
                                />
                            </View>

                        ) : (

                            <FlatList
                                data={resultadosBusca}
                                keyExtractor={item => item.id}
                                renderItem={renderizarUsuario}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={styles.listaUsuarios}
                                ListEmptyComponent={

                                    <View style={styles.estadoBusca}>

                                        <Text style={styles.textoEstadoBusca}>
                                            {termoBusca.trim()
                                                ? 'Nenhum usuário encontrado.'
                                                : 'Digite um nome ou usuário para pesquisar.'}
                                        </Text>

                                    </View>

                                }
                            />

                        )}

                    </View>

                </View>

            </Modal>

        </KeyboardAvoidingView>

    );
}


const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: '#0B0910'
    },

    header: {
        minHeight: 75,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#292431'
    },

    botaoVoltar: {
        width: 38,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center'
    },

    textoVoltar: {
        color: '#F2EFF7',
        fontSize: 35,
        marginTop: -5
    },

    headerInfo: {
        flex: 1,
        marginLeft: 10
    },

    nomeGrupo: {
        color: '#F2EFF7',
        fontSize: 17,
        fontWeight: 'bold'
    },

    subtituloGrupo: {
        color: '#91899D',
        fontSize: 12,
        marginTop: 3
    },

    botaoParticipantes: {
        backgroundColor: '#211B2B',
        borderWidth: 1,
        borderColor: '#8F4FC0',
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 9
    },

    textoBotaoParticipantes: {
        color: '#D6A5F2',
        fontSize: 12,
        fontWeight: 'bold'
    },

    carregandoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },

    listaMensagens: {
        padding: 16,
        paddingBottom: 25,
        flexGrow: 1
    },

    mensagemContainer: {
        marginBottom: 16,
        maxWidth: '85%'
    },

    mensagemMinhaContainer: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end'
    },

    mensagemOutraContainer: {
        alignSelf: 'flex-start',
        alignItems: 'flex-start'
    },

    remetenteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
        marginLeft: 4
    },

    avatarMensagem: {
        width: 23,
        height: 23,
        borderRadius: 12
    },

    avatarPlaceholder: {
        width: 23,
        height: 23,
        borderRadius: 12,
        backgroundColor: '#292431',
        justifyContent: 'center',
        alignItems: 'center'
    },

    avatarPlaceholderTexto: {
        color: '#B66AE8',
        fontSize: 11,
        fontWeight: 'bold'
    },

    nomeRemetente: {
        color: '#91899D',
        fontSize: 11,
        marginLeft: 7
    },

    balao: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 17,
        minWidth: 65
    },

    balaoMeu: {
        backgroundColor: '#B66AE8',
        borderBottomRightRadius: 4
    },

    balaoOutro: {
        backgroundColor: '#211B2B',
        borderBottomLeftRadius: 4
    },

    textoMensagem: {
        color: '#F2EFF7',
        fontSize: 15,
        lineHeight: 21
    },

    horarioMensagem: {
        color: '#E1D0ED',
        fontSize: 10,
        textAlign: 'right',
        marginTop: 5
    },

    vazioContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 150
    },

    vazioTitulo: {
        color: '#F2EFF7',
        fontSize: 17,
        fontWeight: 'bold'
    },

    vazioTexto: {
        color: '#91899D',
        fontSize: 13,
        marginTop: 7
    },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#292431',
        backgroundColor: '#0B0910'
    },

    input: {
        flex: 1,
        backgroundColor: '#17141E',
        borderRadius: 22,
        paddingHorizontal: 17,
        paddingVertical: 11,
        color: '#F2EFF7',
        fontSize: 15,
        maxHeight: 110
    },

    botaoEnviar: {
        width: 43,
        height: 43,
        borderRadius: 22,
        backgroundColor: '#B66AE8',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 9
    },

    botaoDesativado: {
        opacity: 0.4
    },

    textoEnviar: {
        color: '#FFFFFF',
        fontSize: 19
    },

    // Modal
    modalFundo: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end'
    },

    modalContainer: {
        height: '85%',
        backgroundColor: '#17141E',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 22,
        paddingBottom: 20
    },

    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },

    modalTitulo: {
        color: '#F2EFF7',
        fontSize: 19,
        fontWeight: 'bold'
    },

    modalSubtitulo: {
        color: '#91899D',
        fontSize: 12,
        marginTop: 5
    },

    botaoFechar: {
        width: 35,
        height: 35,
        borderRadius: 18,
        backgroundColor: '#292431',
        justifyContent: 'center',
        alignItems: 'center'
    },

    textoFechar: {
        color: '#F2EFF7',
        fontSize: 25,
        marginTop: -3
    },

    inputBusca: {
        height: 48,
        backgroundColor: '#211B2B',
        borderRadius: 12,
        paddingHorizontal: 15,
        color: '#F2EFF7',
        fontSize: 14,
        marginBottom: 15
    },

    listaUsuarios: {
        paddingBottom: 20
    },

    usuarioItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#292431'
    },

    avatarUsuario: {
        width: 43,
        height: 43,
        borderRadius: 22
    },

    avatarUsuarioPlaceholder: {
        width: 43,
        height: 43,
        borderRadius: 22,
        backgroundColor: '#292431',
        justifyContent: 'center',
        alignItems: 'center'
    },

    avatarUsuarioTexto: {
        color: '#B66AE8',
        fontSize: 16,
        fontWeight: 'bold'
    },

    usuarioInfo: {
        flex: 1,
        marginLeft: 12
    },

    usuarioNome: {
        color: '#F2EFF7',
        fontSize: 14,
        fontWeight: 'bold'
    },

    usuarioUsername: {
        color: '#91899D',
        fontSize: 12,
        marginTop: 3
    },

    botaoAdicionar: {
        backgroundColor: '#8F4FC0',
        minWidth: 85,
        height: 34,
        paddingHorizontal: 10,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center'
    },

    textoBotaoAdicionar: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold'
    },

    estadoBusca: {
        flex: 1,
        minHeight: 130,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20
    },

    textoEstadoBusca: {
        color: '#91899D',
        fontSize: 13,
        textAlign: 'center'
    }

});