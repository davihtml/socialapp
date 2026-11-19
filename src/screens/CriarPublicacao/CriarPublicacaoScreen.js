import React, { useState } from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Image,
    ScrollView,
    ActivityIndicator
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../contexts/AuthContext';

import { criarPublicacao } from '../../services/posts';

import { enviarImagemPublicacao } from '../../services/postImages';


// Paleta visual
const CORES = {
    fundo: '#0B0910',
    card: '#17141E',
    cardSecundario: '#211B2B',
    destaque: '#B66AE8',
    texto: '#F2EFF7',
    secundario: '#91899D',
    borda: '#292431',
    vermelho: '#D96B87'
};


export default function CriarPublicacaoScreen({
    onVoltar,
    onPublicado
}) {

    const { user } = useAuth();

    const [conteudo, setConteudo] = useState('');
    const [imagem, setImagem] = useState(null);
    const [carregando, setCarregando] = useState(false);


    // Selecionar imagem
    async function selecionarImagem() {

        try {

            const permissao =
                await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permissao.granted) {

                Alert.alert(
                    'Permissão necessária',
                    'Precisamos de acesso à galeria para selecionar uma imagem.'
                );

                return;
            }

            const resultado = await ImagePicker.launchImageLibraryAsync({

                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8

            });

            if (!resultado.canceled) {
                setImagem(resultado.assets[0]);
            }

        } catch (error) {

            console.log('Erro ao selecionar imagem:', error);

            Alert.alert(
                'Erro',
                'Não foi possível selecionar a imagem.'
            );

        }

    }


    // Remover imagem
    function removerImagem() {
        setImagem(null);
    }


    // Publicar
    async function publicar() {

        if (!conteudo.trim() && !imagem) {

            Alert.alert(
                'Atenção',
                'Escreva alguma coisa ou selecione uma imagem.'
            );

            return;
        }

        if (conteudo.trim().length > 500) {

            Alert.alert(
                'Limite excedido',
                'Sua publicação pode ter no máximo 500 caracteres.'
            );

            return;
        }

        try {

            setCarregando(true);

            let imageUrl = null;

            if (imagem) {

                imageUrl = await enviarImagemPublicacao(
                    user.id,
                    imagem
                );

            }

            await criarPublicacao(conteudo, imageUrl);

            setConteudo('');
            setImagem(null);

            onPublicado();

        } catch (error) {

            console.log('Erro ao publicar:', error);

            Alert.alert(
                'Erro',
                error.message || 'Não foi possível criar sua publicação.'
            );

        } finally {

            setCarregando(false);

        }

    }


    const podePublicar = !!conteudo.trim() || !!imagem;


    return (

        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >

            {/* Cabeçalho */}

            <View style={styles.header}>

                <TouchableOpacity
                    style={styles.botaoVoltar}
                    onPress={onVoltar}
                    disabled={carregando}
                    activeOpacity={0.7}
                >

                    <Text style={styles.iconeVoltar}>
                        ‹
                    </Text>

                </TouchableOpacity>


                <Text style={styles.titulo}>
                    Nova publicação
                </Text>


                <TouchableOpacity
                    style={[
                        styles.botaoPublicar,
                        (!podePublicar || carregando) && styles.botaoDesativado
                    ]}
                    onPress={publicar}
                    disabled={!podePublicar || carregando}
                    activeOpacity={0.85}
                >

                    {carregando ? (

                        <ActivityIndicator
                            color={CORES.texto}
                            size="small"
                        />

                    ) : (

                        <Text style={styles.textoBotaoPublicar}>
                            Publicar
                        </Text>

                    )}

                </TouchableOpacity>

            </View>


            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.conteudoScroll}
            >

                {/* Introdução */}

                <View style={styles.introducao}>

                    <View style={styles.etiqueta}>

                        <View style={styles.pontoEtiqueta} />

                        <Text style={styles.textoEtiqueta}>
                            COMPARTILHAR
                        </Text>

                    </View>

                    <Text style={styles.tituloSecao}>
                        O que está acontecendo?
                    </Text>

                    <Text style={styles.subtitulo}>
                        Compartilhe suas ideias, momentos e experiências com a comunidade.
                    </Text>

                </View>


                {/* Editor */}

                <View style={styles.cartaoEditor}>

                    {/* Autor */}

                    <View style={styles.editorHeader}>

                        <View style={styles.avatar}>

                            <Text style={styles.avatarTexto}>
                                {user?.email?.charAt(0).toUpperCase() || 'U'}
                            </Text>

                        </View>


                        <View style={styles.informacoesAutor}>

                            <Text style={styles.nomeAutor}>
                                Sua publicação
                            </Text>

                            <Text style={styles.identificacaoAutor}>
                                Compartilhando com a comunidade
                            </Text>

                        </View>


                        <View style={styles.seloPublicacao}>

                            <Text style={styles.seloTexto}>
                                logo
                            </Text>

                        </View>

                    </View>


                    {/* Texto */}

                    <TextInput
                        style={styles.input}
                        placeholder="Escreva algo interessante..."
                        placeholderTextColor={CORES.secundario}
                        multiline
                        maxLength={500}
                        value={conteudo}
                        onChangeText={setConteudo}
                        textAlignVertical="top"
                    />


                    {/* Contador */}

                    <View style={styles.contadorContainer}>

                        <Text style={styles.dica}>
                            Compartilhe algo com a comunidade.
                        </Text>

                        <Text
                            style={[
                                styles.contador,
                                conteudo.length >= 450 && styles.contadorAlerta
                            ]}
                        >
                            {conteudo.length}/500
                        </Text>

                    </View>


                    {/* Prévia da imagem */}

                    {imagem && (

                        <View style={styles.areaImagem}>

                            <Image
                                source={{ uri: imagem.uri }}
                                style={styles.imagemPreview}
                                resizeMode="cover"
                            />

                            <TouchableOpacity
                                style={styles.botaoRemover}
                                onPress={removerImagem}
                                activeOpacity={0.8}
                            >

                                <Text style={styles.textoRemover}>
                                    ✕
                                </Text>

                            </TouchableOpacity>

                        </View>

                    )}

                </View>


                {/* Adicionar imagem */}

                <View style={styles.cartaoFerramentas}>

                    <View style={styles.ferramentaInfo}>

                        <View style={styles.iconeFerramentaContainer}>

                            <Text style={styles.iconeImagem}>
                                ▧
                            </Text>

                        </View>


                        <View style={styles.textosFerramenta}>

                            <Text style={styles.tituloFerramenta}>
                                Adicionar imagem
                            </Text>

                            <Text style={styles.descricaoFerramenta}>
                                Inclua uma foto na sua publicação.
                            </Text>

                        </View>

                    </View>


                    <TouchableOpacity
                        style={styles.botaoImagem}
                        onPress={selecionarImagem}
                        disabled={carregando}
                        activeOpacity={0.8}
                    >

                        <Text style={styles.textoImagem}>
                            {imagem ? 'Alterar' : 'Selecionar'}
                        </Text>

                    </TouchableOpacity>

                </View>


                {/* Aviso */}

                <View style={styles.avisoContainer}>

                    <Text style={styles.iconeAviso}>
                        ◈
                    </Text>

                    <Text style={styles.aviso}>
                        Sua publicação ficará visível para os usuários da comunidade.
                    </Text>

                </View>

            </ScrollView>

        </KeyboardAvoidingView>

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
        height: 65,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: CORES.fundo,
        borderBottomWidth: 1,
        borderBottomColor: CORES.borda
    },

    botaoVoltar: {
        width: 39,
        height: 39,
        borderRadius: 13,
        backgroundColor: CORES.card,
        borderWidth: 1,
        borderColor: CORES.borda,
        alignItems: 'center',
        justifyContent: 'center'
    },

    iconeVoltar: {
        fontSize: 31,
        color: CORES.texto,
        lineHeight: 34
    },

    titulo: {
        color: CORES.texto,
        fontSize: 15,
        fontWeight: '700'
    },

    botaoPublicar: {
        backgroundColor: CORES.destaque,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 11,
        minWidth: 82,
        alignItems: 'center'
    },

    botaoDesativado: {
        opacity: 0.4
    },

    textoBotaoPublicar: {
        color: '#170D20',
        fontSize: 12,
        fontWeight: '800'
    },

    // Conteúdo
    conteudoScroll: {
        paddingHorizontal: 18,
        paddingTop: 27,
        paddingBottom: 45
    },

    introducao: {
        marginBottom: 22
    },

    etiqueta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },

    pontoEtiqueta: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: CORES.destaque,
        marginRight: 7
    },

    textoEtiqueta: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        color: CORES.destaque
    },

    tituloSecao: {
        fontSize: 23,
        fontWeight: '800',
        color: CORES.texto,
        letterSpacing: -0.5
    },

    subtitulo: {
        fontSize: 12,
        lineHeight: 19,
        color: CORES.secundario,
        marginTop: 7
    },

    // Editor
    cartaoEditor: {
        backgroundColor: CORES.card,
        borderRadius: 20,
        padding: 17,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    editorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: CORES.borda
    },

    avatar: {
        width: 44,
        height: 44,
        borderRadius: 15,
        backgroundColor: CORES.cardSecundario,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#493653'
    },

    avatarTexto: {
        color: CORES.destaque,
        fontSize: 18,
        fontWeight: '800'
    },

    informacoesAutor: {
        flex: 1,
        marginLeft: 11
    },

    nomeAutor: {
        color: CORES.texto,
        fontSize: 13,
        fontWeight: '700'
    },

    identificacaoAutor: {
        color: CORES.secundario,
        fontSize: 10,
        marginTop: 4
    },

    seloPublicacao: {
        backgroundColor: CORES.cardSecundario,
        borderWidth: 1,
        borderColor: '#493653',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8
    },

    seloTexto: {
        color: CORES.destaque,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1
    },

    // Campo de texto
    input: {
        minHeight: 180,
        paddingTop: 18,
        paddingBottom: 12,
        color: CORES.texto,
        fontSize: 15,
        lineHeight: 24
    },

    contadorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: CORES.borda
    },

    dica: {
        fontSize: 10,
        color: CORES.secundario,
        flex: 1,
        marginRight: 8
    },

    contador: {
        color: CORES.secundario,
        fontSize: 11
    },

    contadorAlerta: {
        color: CORES.vermelho,
        fontWeight: '700'
    },

    // Imagem
    areaImagem: {
        marginTop: 17,
        position: 'relative'
    },

    imagemPreview: {
        width: '100%',
        height: 230,
        borderRadius: 14,
        backgroundColor: CORES.cardSecundario
    },

    botaoRemover: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 33,
        height: 33,
        borderRadius: 12,
        backgroundColor: '#0B0910',
        borderWidth: 1,
        borderColor: CORES.borda,
        justifyContent: 'center',
        alignItems: 'center'
    },

    textoRemover: {
        color: CORES.texto,
        fontSize: 15,
        fontWeight: '700'
    },

    // Ferramentas
    cartaoFerramentas: {
        backgroundColor: CORES.card,
        borderRadius: 17,
        padding: 15,
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: CORES.borda
    },

    ferramentaInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center'
    },

    iconeFerramentaContainer: {
        width: 43,
        height: 43,
        borderRadius: 13,
        backgroundColor: CORES.cardSecundario,
        borderWidth: 1,
        borderColor: '#493653',
        justifyContent: 'center',
        alignItems: 'center'
    },

    iconeImagem: {
        color: CORES.destaque,
        fontSize: 23
    },

    textosFerramenta: {
        flex: 1,
        marginLeft: 11
    },

    tituloFerramenta: {
        fontSize: 12,
        fontWeight: '700',
        color: CORES.texto
    },

    descricaoFerramenta: {
        fontSize: 10,
        color: CORES.secundario,
        marginTop: 4
    },

    botaoImagem: {
        backgroundColor: CORES.cardSecundario,
        borderWidth: 1,
        borderColor: '#493653',
        paddingHorizontal: 13,
        paddingVertical: 10,
        borderRadius: 10,
        marginLeft: 8
    },

    textoImagem: {
        color: CORES.destaque,
        fontSize: 11,
        fontWeight: '700'
    },

    // Aviso
    avisoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 21,
        paddingHorizontal: 12
    },

    iconeAviso: {
        color: CORES.destaque,
        fontSize: 15,
        marginRight: 8
    },

    aviso: {
        flex: 1,
        fontSize: 10,
        lineHeight: 16,
        color: CORES.secundario
    }

});