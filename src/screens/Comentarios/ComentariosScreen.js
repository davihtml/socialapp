import React, { useEffect, useState } from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Image
} from 'react-native';

import { useAuth } from '../../contexts/AuthContext';

import {
    buscarComentarios,
    criarComentario,
    editarComentario,
    excluirComentario,
    alternarCurtidaComentario
} from '../../services/comments';


export default function ComentariosScreen({
    publicacao,
    onVoltar
}) {

    const { user } = useAuth();

    const [comentarios, setComentarios] = useState([]);
    const [texto, setTexto] = useState('');

    const [respondendoA, setRespondendoA] = useState(null);

    const [editandoId, setEditandoId] = useState(null);
    const [textoEdicao, setTextoEdicao] = useState('');
    const [salvandoEdicao, setSalvandoEdicao] = useState(false);

    const [loading, setLoading] = useState(true);
    const [enviando, setEnviando] = useState(false);

    const [curtidasProcessando, setCurtidasProcessando] = useState([]);


    // Formatar data e horário
    function formatarData(data) {

        if (!data) return '';

        const dataComentario = new Date(data);

        if (isNaN(dataComentario.getTime())) {
            return '';
        }

        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(dataComentario);

    }


    // Organizar comentários em estrutura hierárquica
    function organizarComentarios(lista) {

        const mapa = {};
        const principais = [];

        lista.forEach(item => {

            mapa[item.id] = {
                ...item,
                respostas: []
            };

        });

        lista.forEach(item => {

            if (item.parent_id) {

                const pai = mapa[item.parent_id];

                if (pai) {
                    pai.respostas.push(mapa[item.id]);
                }

            } else {

                principais.push(mapa[item.id]);

            }

        });

        return principais;

    }


    // Carregar comentários
    async function carregarComentarios() {

        try {

            const dados = await buscarComentarios(publicacao.id);

            setComentarios(organizarComentarios(dados));

        } catch (error) {

            console.log('Erro ao buscar comentários:', error);

            Alert.alert(
                'Erro',
                'Não foi possível carregar os comentários.'
            );

        } finally {

            setLoading(false);

        }

    }


    // Enviar comentário ou resposta
    async function handleEnviar() {

        if (!texto.trim()) {
            return;
        }

        try {

            setEnviando(true);

            await criarComentario(
                publicacao.id,
                texto,
                respondendoA?.id || null
            );

            setTexto('');
            setRespondendoA(null);

            await carregarComentarios();

        } catch (error) {

            console.log('Erro ao enviar comentário:', error);

            Alert.alert(
                'Erro',
                error.message || 'Não foi possível enviar o comentário.'
            );

        } finally {

            setEnviando(false);

        }

    }


    // Iniciar edição
    function iniciarEdicao(item) {

        setRespondendoA(null);

        setEditandoId(item.id);
        setTextoEdicao(item.content);

    }


    // Cancelar edição
    function cancelarEdicao() {

        setEditandoId(null);
        setTextoEdicao('');

    }


    // Salvar edição
    async function handleSalvarEdicao(commentId) {

        if (!textoEdicao.trim()) {

            Alert.alert(
                'Atenção',
                'O comentário não pode estar vazio.'
            );

            return;

        }

        try {

            setSalvandoEdicao(true);

            await editarComentario(
                commentId,
                textoEdicao
            );

            setEditandoId(null);
            setTextoEdicao('');

            await carregarComentarios();

        } catch (error) {

            console.log('Erro ao editar comentário:', error);

            Alert.alert(
                'Erro',
                error.message || 'Não foi possível editar o comentário.'
            );

        } finally {

            setSalvandoEdicao(false);

        }

    }


    // Curtir ou descurtir comentário
    async function handleCurtir(item) {

        if (curtidasProcessando.includes(item.id)) {
            return;
        }

        const curtidas = item.comment_likes || [];

        const jaCurtiu = curtidas.some(
            curtida => curtida.user_id === user?.id
        );

        try {

            setCurtidasProcessando(atual => [
                ...atual,
                item.id
            ]);

            await alternarCurtidaComentario(
                item.id,
                jaCurtiu
            );

            await carregarComentarios();

        } catch (error) {

            console.log('Erro ao curtir comentário:', error);

            Alert.alert(
                'Erro',
                error.message || 'Não foi possível atualizar a curtida.'
            );

        } finally {

            setCurtidasProcessando(atual =>
                atual.filter(id => id !== item.id)
            );

        }

    }


    // Selecionar comentário para responder
    function iniciarResposta(item) {

        cancelarEdicao();
        setRespondendoA(item);

    }


    // Cancelar resposta
    function cancelarResposta() {

        setRespondendoA(null);

    }


    // Excluir comentário
    function confirmarExclusao(commentId) {

        Alert.alert(
            'Excluir comentário',
            'Tem certeza de que deseja excluir este comentário? As respostas também serão excluídas.',
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

                            await excluirComentario(commentId);

                            await carregarComentarios();

                            if (respondendoA?.id === commentId) {
                                setRespondendoA(null);
                            }

                            if (editandoId === commentId) {
                                cancelarEdicao();
                            }

                        } catch (error) {

                            Alert.alert(
                                'Erro',
                                'Não foi possível excluir o comentário.'
                            );

                        }

                    }
                }
            ]
        );

    }


    // Renderizar comentário e respostas
    function renderizarComentario(item, nivel = 0) {

        const perfil = item.profiles;

        const nome = perfil?.full_name || 'Usuário';

        const username = perfil?.username || 'usuario';

        const meuComentario = item.user_id === user?.id;

        const curtidas = item.comment_likes || [];

        const quantidadeCurtidas = curtidas.length;

        const curtiu = curtidas.some(
            curtida => curtida.user_id === user?.id
        );

        const processandoCurtida = curtidasProcessando.includes(item.id);

        const estaEditando = editandoId === item.id;

        return (

            <View
                key={item.id}
                style={[
                    styles.comentarioBloco,
                    nivel > 0 && styles.respostaBloco
                ]}
            >

                <View style={styles.comentario}>

                    {/* Avatar */}

                    <View style={styles.avatar}>

                        {perfil?.avatar_url ? (

                            <Image
                                source={{
                                    uri: perfil.avatar_url
                                }}
                                style={styles.avatarImagem}
                            />

                        ) : (

                            <Text style={styles.avatarTexto}>
                                {nome.charAt(0).toUpperCase()}
                            </Text>

                        )}

                    </View>


                    <View style={styles.comentarioConteudo}>

                        {/* Informações do usuário */}

                        <View style={styles.comentarioHeader}>

                            <Text style={styles.nome}>
                                {nome}
                            </Text>

                            <Text style={styles.username}>
                                @{username}
                            </Text>

                        </View>


                        {/* Texto ou campo de edição */}

                        {estaEditando ? (

                            <View>

                                <TextInput
                                    style={styles.inputEdicao}
                                    value={textoEdicao}
                                    onChangeText={setTextoEdicao}
                                    multiline
                                    maxLength={500}
                                    autoFocus
                                    placeholder="Edite seu comentário..."
                                    placeholderTextColor="#777777"
                                />

                                <View style={styles.acoesEdicao}>

                                    <TouchableOpacity
                                        style={styles.botaoCancelarEdicao}
                                        onPress={cancelarEdicao}
                                        disabled={salvandoEdicao}
                                    >
                                        <Text style={styles.cancelarEdicaoTexto}>
                                            Cancelar
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.botaoSalvarEdicao,
                                            (!textoEdicao.trim() || salvandoEdicao) &&
                                            styles.botaoDesativado
                                        ]}
                                        onPress={() => handleSalvarEdicao(item.id)}
                                        disabled={!textoEdicao.trim() || salvandoEdicao}
                                    >

                                        {salvandoEdicao ? (

                                            <ActivityIndicator
                                                size="small"
                                                color="#FFFFFF"
                                            />

                                        ) : (

                                            <Text style={styles.salvarEdicaoTexto}>
                                                Salvar
                                            </Text>

                                        )}

                                    </TouchableOpacity>

                                </View>

                            </View>

                        ) : (

                            <Text style={styles.textoComentario}>
                                {item.content}
                            </Text>

                        )}


                        {/* Data, horário e indicação de edição */}

                        <View style={styles.linhaData}>

                            <Text style={styles.dataComentario}>
                                {formatarData(item.created_at)}
                            </Text>

                            {item.edited_at && (

                                <Text style={styles.indicacaoEditado}>
                                    Editado
                                </Text>

                            )}

                        </View>


                        {/* Ações */}

                        {!estaEditando && (

                            <View style={styles.acoesComentario}>

                                <TouchableOpacity
                                    onPress={() => iniciarResposta(item)}
                                >
                                    <Text style={styles.responderTexto}>
                                        Responder
                                    </Text>
                                </TouchableOpacity>


                                {/* Curtida */}

                                <TouchableOpacity
                                    style={styles.botaoCurtida}
                                    onPress={() => handleCurtir(item)}
                                    disabled={processandoCurtida}
                                >

                                    {processandoCurtida ? (

                                        <ActivityIndicator
                                            size="small"
                                            color="#A99DFF"
                                        />

                                    ) : (

                                        <Text
                                            style={[
                                                styles.coracao,
                                                curtiu && styles.coracaoCurtido
                                            ]}
                                        >
                                            {curtiu ? '♥' : '♡'}
                                        </Text>

                                    )}

                                    <Text
                                        style={[
                                            styles.quantidadeCurtidas,
                                            curtiu && styles.quantidadeCurtidasAtiva
                                        ]}
                                    >
                                        {quantidadeCurtidas}
                                    </Text>

                                </TouchableOpacity>


                                {meuComentario && (

                                    <>

                                        <TouchableOpacity
                                            onPress={() => iniciarEdicao(item)}
                                        >
                                            <Text style={styles.editarTexto}>
                                                Editar
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => confirmarExclusao(item.id)}
                                        >
                                            <Text style={styles.excluirTexto}>
                                                Excluir
                                            </Text>
                                        </TouchableOpacity>

                                    </>

                                )}

                            </View>

                        )}

                    </View>

                </View>


                {/* Respostas */}

                {item.respostas?.map(resposta =>
                    renderizarComentario(resposta, nivel + 1)
                )}

            </View>

        );

    }


    useEffect(() => {

        carregarComentarios();

    }, []);


    return (

        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >

            {/* Cabeçalho */}

            <View style={styles.header}>

                <TouchableOpacity onPress={onVoltar}>
                    <Text style={styles.voltar}>
                        ‹
                    </Text>
                </TouchableOpacity>

                <Text style={styles.titulo}>
                    Comentários
                </Text>

                <View style={styles.headerEspaco} />

            </View>


            {/* Publicação original */}

            <View style={styles.publicacao}>

                <Text style={styles.publicacaoLabel}>
                    PUBLICAÇÃO
                </Text>

                <Text style={styles.publicacaoTexto}>
                    {publicacao.content}
                </Text>

            </View>


            {/* Lista de comentários */}

            <ScrollView
                style={styles.lista}
                contentContainerStyle={styles.listaConteudo}
                keyboardShouldPersistTaps="handled"
            >

                {loading ? (

                    <ActivityIndicator
                        size="large"
                        color="#8B7CFF"
                        style={styles.loader}
                    />

                ) : comentarios.length === 0 ? (

                    <Text style={styles.vazio}>
                        Ainda não existem comentários.
                        Seja o primeiro a comentar!
                    </Text>

                ) : (

                    comentarios.map(item =>
                        renderizarComentario(item)
                    )

                )}

            </ScrollView>


            {/* Área de digitação */}

            <View style={styles.areaEnvio}>

                {respondendoA && (

                    <View style={styles.respostaSelecionada}>

                        <Text style={styles.respostaSelecionadaTexto}>
                            Respondendo a @{respondendoA.profiles?.username || 'usuario'}
                        </Text>

                        <TouchableOpacity
                            onPress={cancelarResposta}
                        >
                            <Text style={styles.cancelarResposta}>
                                Cancelar
                            </Text>
                        </TouchableOpacity>

                    </View>

                )}


                <View style={styles.linhaEnvio}>

                    <TextInput
                        style={styles.input}
                        placeholder={
                            respondendoA
                                ? 'Escreva sua resposta...'
                                : 'Escreva um comentário...'
                        }
                        placeholderTextColor="#777777"
                        value={texto}
                        onChangeText={setTexto}
                        multiline
                        maxLength={500}
                    />

                    <TouchableOpacity
                        style={[
                            styles.botaoEnviar,
                            (!texto.trim() || enviando) && styles.botaoDesativado
                        ]}
                        onPress={handleEnviar}
                        disabled={!texto.trim() || enviando}
                    >

                        {enviando ? (

                            <ActivityIndicator color="#FFFFFF" />

                        ) : (

                            <Text style={styles.enviarTexto}>
                                Enviar
                            </Text>

                        )}

                    </TouchableOpacity>

                </View>

            </View>

        </KeyboardAvoidingView>

    );

}


// Estilos

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: '#0D0D12'
    },

    header: {
        height: 60,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#111116',
        borderBottomWidth: 1,
        borderBottomColor: '#22222B'
    },

    voltar: {
        fontSize: 35,
        color: '#FFFFFF'
    },

    titulo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF'
    },

    headerEspaco: {
        width: 25
    },

    publicacao: {
        padding: 18,
        backgroundColor: '#15151D',
        borderBottomWidth: 1,
        borderBottomColor: '#22222B'
    },

    publicacaoLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#8B7CFF',
        marginBottom: 7,
        letterSpacing: 1
    },

    publicacaoTexto: {
        fontSize: 14,
        lineHeight: 21,
        color: '#D5D5DC'
    },

    lista: {
        flex: 1
    },

    listaConteudo: {
        padding: 18,
        flexGrow: 1
    },

    loader: {
        marginTop: 40
    },

    vazio: {
        textAlign: 'center',
        color: '#85858F',
        fontSize: 14,
        lineHeight: 22,
        marginTop: 50,
        paddingHorizontal: 25
    },

    comentarioBloco: {
        marginBottom: 20
    },

    respostaBloco: {
        marginLeft: 18,
        paddingLeft: 12,
        borderLeftWidth: 2,
        borderLeftColor: '#38304F',
        marginTop: 15
    },

    comentario: {
        flexDirection: 'row'
    },

    avatar: {
        width: 38,
        height: 38,
        borderRadius: 20,
        backgroundColor: '#29243C',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 11,
        overflow: 'hidden'
    },

    avatarImagem: {
        width: '100%',
        height: '100%',
        borderRadius: 20
    },

    avatarTexto: {
        color: '#A99DFF',
        fontSize: 16,
        fontWeight: 'bold'
    },

    comentarioConteudo: {
        flex: 1
    },

    comentarioHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 5
    },

    nome: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#FFFFFF'
    },

    username: {
        fontSize: 12,
        color: '#85858F',
        marginLeft: 6
    },

    textoComentario: {
        fontSize: 14,
        lineHeight: 21,
        color: '#D5D5DC'
    },

    inputEdicao: {
        minHeight: 75,
        maxHeight: 150,
        backgroundColor: '#202029',
        borderWidth: 1,
        borderColor: '#51477A',
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        lineHeight: 21,
        color: '#FFFFFF',
        textAlignVertical: 'top'
    },

    acoesEdicao: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 12,
        marginTop: 9
    },

    botaoCancelarEdicao: {
        paddingHorizontal: 12,
        paddingVertical: 9
    },

    cancelarEdicaoTexto: {
        fontSize: 12,
        color: '#9999A5'
    },

    botaoSalvarEdicao: {
        backgroundColor: '#6C5CE7',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 9,
        minWidth: 65,
        alignItems: 'center'
    },

    salvarEdicaoTexto: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold'
    },

    linhaData: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        marginTop: 5
    },

    dataComentario: {
        fontSize: 11,
        color: '#777783'
    },

    indicacaoEditado: {
        fontSize: 10,
        color: '#A99DFF'
    },

    acoesComentario: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginTop: 8
    },

    responderTexto: {
        fontSize: 12,
        fontWeight: '600',
        color: '#A99DFF'
    },

    botaoCurtida: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },

    coracao: {
        fontSize: 19,
        color: '#85858F'
    },

    coracaoCurtido: {
        color: '#FF5577'
    },

    quantidadeCurtidas: {
        fontSize: 12,
        color: '#85858F'
    },

    quantidadeCurtidasAtiva: {
        color: '#FF7790'
    },

    editarTexto: {
        fontSize: 12,
        color: '#A99DFF'
    },

    excluirTexto: {
        fontSize: 12,
        color: '#E36B6B'
    },

    areaEnvio: {
        padding: 12,
        backgroundColor: '#111116',
        borderTopWidth: 1,
        borderTopColor: '#25252F'
    },

    respostaSelecionada: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingHorizontal: 4
    },

    respostaSelecionadaTexto: {
        fontSize: 12,
        color: '#A99DFF',
        fontWeight: '600'
    },

    cancelarResposta: {
        fontSize: 12,
        color: '#9999A5'
    },

    linhaEnvio: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },

    input: {
        flex: 1,
        minHeight: 43,
        maxHeight: 100,
        backgroundColor: '#202029',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: '#FFFFFF'
    },

    botaoEnviar: {
        backgroundColor: '#6C5CE7',
        paddingHorizontal: 17,
        paddingVertical: 13,
        borderRadius: 12
    },

    botaoDesativado: {
        opacity: 0.5
    },

    enviarTexto: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: 'bold'
    }

});