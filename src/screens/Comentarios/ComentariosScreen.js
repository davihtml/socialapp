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
    excluirComentario
} from '../../services/comments';


export default function ComentariosScreen({
    publicacao,
    onVoltar
}) {

    const { user } = useAuth();

    const [comentarios, setComentarios] = useState([]);
    const [texto, setTexto] = useState('');

    const [loading, setLoading] = useState(true);
    const [enviando, setEnviando] = useState(false);


    // Carregar comentários
async function carregarComentarios() {

    console.log('CARREGANDO COMENTÁRIOS...');

    try {

        const dados = await buscarComentarios(publicacao.id);

        console.log(
            'DADOS DOS COMENTÁRIOS:',
            JSON.stringify(dados, null, 2)
        );

        setComentarios(dados);

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


    // Enviar comentário
    async function handleEnviar() {

        if (!texto.trim()) {
            return;
        }

        try {

            setEnviando(true);

            await criarComentario(publicacao.id, texto);

            setTexto('');

            await carregarComentarios();

        } catch (error) {

            console.log('Erro ao enviar comentário:', error);

            Alert.alert(
                'Erro',
                'Não foi possível enviar o comentário.'
            );

        } finally {

            setEnviando(false);

        }

    }


    // Excluir comentário
    function confirmarExclusao(commentId) {

        Alert.alert(
            'Excluir comentário',
            'Tem certeza de que deseja excluir este comentário?',
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

                            setComentarios(comentariosAtuais =>
                                comentariosAtuais.filter(
                                    item => item.id !== commentId
                                )
                            );

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


    useEffect(() => {

        carregarComentarios();

    }, []);


    return (

        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                        color="#6C5CE7"
                        style={styles.loader}
                    />

                ) : comentarios.length === 0 ? (

                    <Text style={styles.vazio}>
                        Ainda não existem comentários.
                        Seja o primeiro a comentar!
                    </Text>

                ) : (

                    comentarios.map(item => {

                        const perfil = item.profiles;

                        const nome = perfil?.full_name || 'Usuário';

                        const username = perfil?.username || 'usuario';

                        const meuComentario = item.user_id === user?.id;

                        return (

                            <View
                                key={item.id}
                                style={styles.comentario}
                            >

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

                                    <View style={styles.comentarioHeader}>

                                        <Text style={styles.nome}>
                                            {nome}
                                        </Text>

                                        <Text style={styles.username}>
                                            @{username}
                                        </Text>

                                    </View>

                                    <Text style={styles.textoComentario}>
                                        {item.content}
                                    </Text>

                                    {meuComentario && (

                                        <TouchableOpacity
                                            onPress={() => confirmarExclusao(item.id)}
                                            style={styles.botaoExcluir}
                                        >
                                            <Text style={styles.excluirTexto}>
                                                Excluir
                                            </Text>
                                        </TouchableOpacity>

                                    )}

                                </View>

                            </View>

                        );

                    })

                )}

            </ScrollView>


            {/* Campo para escrever comentário */}

            <View style={styles.areaEnvio}>

                <TextInput
                    style={styles.input}
                    placeholder="Escreva um comentário..."
                    placeholderTextColor="#999999"
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

        </KeyboardAvoidingView>

    );

}


// Estilos

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: '#FFFFFF'
    },

    header: {
        height: 60,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE'
    },

    voltar: {
        fontSize: 35,
        color: '#171717'
    },

    titulo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#171717'
    },

    headerEspaco: {
        width: 25
    },

    publicacao: {
        padding: 18,
        backgroundColor: '#F8F7FC',
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE'
    },

    publicacaoLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#6C5CE7',
        marginBottom: 7,
        letterSpacing: 1
    },

    publicacaoTexto: {
        fontSize: 14,
        lineHeight: 21,
        color: '#333333'
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
        color: '#888888',
        fontSize: 14,
        lineHeight: 22,
        marginTop: 50,
        paddingHorizontal: 25
    },

    comentario: {
        flexDirection: 'row',
        marginBottom: 23
    },

    avatar: {
        width: 38,
        height: 38,
        borderRadius: 20,
        backgroundColor: '#EAE6FF',
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
        color: '#6C5CE7',
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
        color: '#171717'
    },

    username: {
        fontSize: 12,
        color: '#888888',
        marginLeft: 6
    },

    textoComentario: {
        fontSize: 14,
        lineHeight: 21,
        color: '#333333'
    },

    botaoExcluir: {
        alignSelf: 'flex-start',
        marginTop: 7
    },

    excluirTexto: {
        fontSize: 12,
        color: '#D9534F'
    },

    areaEnvio: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
        gap: 10
    },

    input: {
        flex: 1,
        minHeight: 43,
        maxHeight: 100,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: '#171717'
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