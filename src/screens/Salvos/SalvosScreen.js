import React, { useEffect, useState } from 'react';

import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Image
} from 'react-native';

import {
    buscarPublicacoesSalvas,
    alternarPublicacaoSalva
} from '../../services/posts';

const CORES = {
    fundo: '#0B0910',
    card: '#17141E',
    cardSecundario: '#211B2B',
    destaque: '#B66AE8',
    texto: '#F2EFF7',
    secundario: '#91899D',
    borda: '#292431'
};


function formatarTempo(data) {

    const diferenca = Math.floor(
        (new Date() - new Date(data)) / 1000
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


export default function SalvosScreen({
    onVoltar,
    onAbrirPublicacao,
    onAbrirPerfil,
    onAbrirComentarios
}) {

    const [publicacoes, setPublicacoes] = useState([]);
    const [loading, setLoading] = useState(true);


    async function carregarSalvos() {

        try {

            setLoading(true);

            const dados = await buscarPublicacoesSalvas();

            setPublicacoes(dados || []);

        } catch (error) {

            console.log('Erro ao buscar publicações salvas:', error);

            Alert.alert(
                'Erro',
                'Não foi possível carregar suas publicações salvas.'
            );

        } finally {

            setLoading(false);

        }

    }


    useEffect(() => {

        carregarSalvos();

    }, []);


    async function removerSalvo(item) {

        try {

            await alternarPublicacaoSalva(item.id, true);

            setPublicacoes(atuais =>
                atuais.filter(publicacao => publicacao.id !== item.id)
            );

        } catch (error) {

            console.log('Erro ao remover publicação salva:', error);

            Alert.alert(
                'Erro',
                'Não foi possível remover esta publicação dos salvos.'
            );

        }

    }


    return (

        <View style={styles.container}>

            {/* Cabeçalho */}

            <View style={styles.header}>

                <TouchableOpacity
                    style={styles.botaoVoltar}
                    onPress={onVoltar}
                    activeOpacity={0.8}
                >

                    <Text style={styles.iconeVoltar}>‹</Text>

                </TouchableOpacity>

                <View style={styles.headerInfo}>

                    <Text style={styles.headerTitulo}>
                        Salvos
                    </Text>

                    <Text style={styles.headerSubtitulo}>
                        Suas publicações favoritas
                    </Text>

                </View>

                <View style={styles.headerEspaco} />

            </View>


            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.conteudo}
            >

                {loading ? (

                    <ActivityIndicator
                        size="large"
                        color={CORES.destaque}
                        style={styles.loader}
                    />

                ) : publicacoes.length === 0 ? (

                    <View style={styles.vazio}>

                        <Text style={styles.vazioIcone}>
                            ▱
                        </Text>

                        <Text style={styles.vazioTitulo}>
                            Nenhuma publicação salva
                        </Text>

                        <Text style={styles.vazioTexto}>
                            Quando você salvar uma publicação no feed,
                            ela aparecerá aqui.
                        </Text>

                    </View>

                ) : (

                    publicacoes.map(item => {

                        const perfil = item.profiles;

                        const nome = perfil?.full_name || 'Usuário';
                        const username = perfil?.username || 'usuario';

                        return (

                            <View
                                key={item.id}
                                style={styles.post}
                            >

                                {/* Autor */}

                                <View style={styles.postHeader}>

                                    <TouchableOpacity
                                        style={styles.avatar}
                                        onPress={() => onAbrirPerfil?.(item.user_id)}
                                        activeOpacity={0.8}
                                    >

                                        {perfil?.avatar_url ? (

                                            <Image
                                                source={{ uri: perfil.avatar_url }}
                                                style={styles.avatarImagem}
                                            />

                                        ) : (

                                            <Text style={styles.avatarTexto}>
                                                {nome.charAt(0).toUpperCase()}
                                            </Text>

                                        )}

                                    </TouchableOpacity>


                                    <TouchableOpacity
                                        style={styles.autor}
                                        onPress={() => onAbrirPerfil?.(item.user_id)}
                                        activeOpacity={0.8}
                                    >

                                        <Text style={styles.nome}>
                                            {nome}
                                        </Text>

                                        <Text style={styles.username}>
                                            @{username}
                                        </Text>

                                    </TouchableOpacity>


                                    <Text style={styles.tempo}>
                                        {formatarTempo(item.created_at)}
                                    </Text>


                                    <TouchableOpacity
                                        style={styles.botaoRemover}
                                        onPress={() => removerSalvo(item)}
                                        activeOpacity={0.8}
                                    >

                                        <Text style={styles.iconeRemover}>
                                            ▰
                                        </Text>

                                    </TouchableOpacity>

                                </View>


                                {/* Conteúdo */}

                                {!!item.content?.trim() && (

                                    <Text style={styles.texto}>
                                        {item.content}
                                    </Text>

                                )}


                                {/* Imagem */}

                                {!!item.image_url && (

                                    <TouchableOpacity
                                        activeOpacity={0.95}
                                        onPress={() => onAbrirPublicacao?.(item.id)}
                                    >

                                        <Image
                                            source={{ uri: item.image_url }}
                                            style={styles.imagem}
                                            resizeMode="cover"
                                        />

                                    </TouchableOpacity>

                                )}


                                {/* Ações */}

                                <View style={styles.acoes}>

                                    <View style={styles.acao}>

                                        <Text style={styles.acaoIcone}>
                                            ♥
                                        </Text>

                                        <Text style={styles.acaoTexto}>
                                            {item.likes?.length || 0}
                                        </Text>

                                    </View>


                                    <TouchableOpacity
                                        style={styles.acao}
                                        onPress={() => onAbrirComentarios?.(item.id)}
                                        activeOpacity={0.8}
                                    >

                                        <Text style={styles.acaoIcone}>
                                            ○
                                        </Text>

                                        <Text style={styles.acaoTexto}>
                                            {item.comments?.length || 0}
                                        </Text>

                                    </TouchableOpacity>


                                    <TouchableOpacity
                                        style={styles.abrirPost}
                                        onPress={() => onAbrirPublicacao?.(item.id)}
                                        activeOpacity={0.8}
                                    >

                                        <Text style={styles.abrirPostTexto}>
                                            Ver publicação →
                                        </Text>

                                    </TouchableOpacity>

                                </View>

                            </View>

                        );

                    })

                )}

            </ScrollView>

        </View>

    );

}


const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: CORES.fundo
    },

    header: {
        height: 75,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: CORES.borda
    },

    botaoVoltar: {
        width: 40,
        height: 40,
        borderRadius: 13,
        backgroundColor: CORES.card,
        borderWidth: 1,
        borderColor: CORES.borda,
        alignItems: 'center',
        justifyContent: 'center'
    },

    iconeVoltar: {
        fontSize: 32,
        color: CORES.texto,
        lineHeight: 35
    },

    headerInfo: {
        flex: 1,
        marginLeft: 13
    },

    headerTitulo: {
        fontSize: 18,
        fontWeight: '700',
        color: CORES.texto
    },

    headerSubtitulo: {
        fontSize: 11,
        color: CORES.secundario,
        marginTop: 3
    },

    headerEspaco: {
        width: 40
    },

    conteudo: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 110,
        flexGrow: 1
    },

    loader: {
        marginTop: 70
    },

    vazio: {
        flex: 1,
        minHeight: 350,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 25
    },

    vazioIcone: {
        fontSize: 48,
        color: CORES.destaque,
        marginBottom: 18
    },

    vazioTitulo: {
        fontSize: 17,
        fontWeight: '700',
        color: CORES.texto,
        textAlign: 'center'
    },

    vazioTexto: {
        fontSize: 12,
        lineHeight: 20,
        color: CORES.secundario,
        textAlign: 'center',
        marginTop: 9
    },

    post: {
        backgroundColor: CORES.card,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: CORES.borda,
        padding: 15,
        marginBottom: 13
    },

    postHeader: {
        flexDirection: 'row',
        alignItems: 'center'
    },

    avatar: {
        width: 42,
        height: 42,
        borderRadius: 15,
        backgroundColor: CORES.cardSecundario,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
    },

    avatarImagem: {
        width: '100%',
        height: '100%'
    },

    avatarTexto: {
        color: CORES.destaque,
        fontSize: 17,
        fontWeight: '700'
    },

    autor: {
        flex: 1,
        marginLeft: 10
    },

    nome: {
        fontSize: 13,
        fontWeight: '700',
        color: CORES.texto
    },

    username: {
        fontSize: 10,
        color: CORES.secundario,
        marginTop: 3
    },

    tempo: {
        fontSize: 10,
        color: CORES.secundario,
        marginRight: 10
    },

    botaoRemover: {
        padding: 5
    },

    iconeRemover: {
        fontSize: 21,
        color: CORES.destaque
    },

    texto: {
        fontSize: 14,
        lineHeight: 22,
        color: CORES.texto,
        marginTop: 14
    },

    imagem: {
        width: '100%',
        height: 240,
        borderRadius: 13,
        marginTop: 13,
        backgroundColor: CORES.cardSecundario
    },

    acoes: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        marginTop: 15,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: CORES.borda
    },

    acao: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },

    acaoIcone: {
        fontSize: 17,
        color: CORES.destaque
    },

    acaoTexto: {
        fontSize: 11,
        color: CORES.secundario
    },

    abrirPost: {
        marginLeft: 'auto'
    },

    abrirPostTexto: {
        fontSize: 11,
        fontWeight: '700',
        color: CORES.destaque
    }

});