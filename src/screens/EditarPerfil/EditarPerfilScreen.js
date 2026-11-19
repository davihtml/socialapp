import React, { useState } from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView
} from 'react-native';

import { atualizarPerfil } from '../../services/profiles';


const CORES = {
    fundo: '#0B0910',
    cartao: '#17141E',
    cartaoSecundario: '#211B2B',
    destaque: '#B66AE8',
    destaqueEscuro: '#8F4FC0',
    texto: '#F2EFF7',
    secundario: '#91899D',
    borda: '#292431',
    branco: '#FFFFFF'
};


export default function EditarPerfilScreen({
    perfil,
    onVoltar,
    onSalvo
}) {

    const [nome, setNome] = useState(perfil.full_name || '');
    const [username, setUsername] = useState(perfil.username || '');
    const [bio, setBio] = useState(perfil.bio || '');

    const [salvando, setSalvando] = useState(false);


    // Salvar alterações
    async function handleSalvar() {

        if (!nome.trim()) {
            Alert.alert('Atenção', 'Informe seu nome.');
            return;
        }

        if (!username.trim()) {
            Alert.alert('Atenção', 'Informe seu nome de usuário.');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {

            Alert.alert(
                'Atenção',
                'O nome de usuário só pode conter letras, números e underline.'
            );

            return;
        }

        try {

            setSalvando(true);

            const perfilAtualizado = await atualizarPerfil(
                perfil.id,
                {
                    full_name: nome.trim(),
                    username: username.trim(),
                    bio: bio.trim()
                }
            );

            Alert.alert(
                'Sucesso',
                'Seu perfil foi atualizado!'
            );

            onSalvo(perfilAtualizado);

        } catch (error) {

            console.log(
                'Erro ao atualizar perfil:',
                error
            );

            if (error.code === '23505') {

                Alert.alert(
                    'Nome indisponível',
                    'Esse nome de usuário já está sendo utilizado.'
                );

            } else {

                Alert.alert(
                    'Erro',
                    'Não foi possível atualizar seu perfil.'
                );

            }

        } finally {

            setSalvando(false);

        }

    }


    return (

        <View style={styles.container}>

            {/* CABEÇALHO */}

            <View style={styles.header}>

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
                    Editar perfil
                </Text>


                <View style={styles.headerEspaco} />

            </View>


            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.conteudo}
                keyboardShouldPersistTaps="handled"
            >

                {/* INTRODUÇÃO */}

                <View style={styles.introducao}>

                    <Text style={styles.tituloSecao}>
                        Personalize seu espaço
                    </Text>

                    <Text style={styles.subtitulo}>
                        Atualize suas informações e mostre à comunidade quem você é.
                    </Text>

                </View>


                {/* PRÉVIA DO PERFIL */}

                <View style={styles.cartaoPerfil}>

                    <View style={styles.avatar}>

                        <Text style={styles.avatarTexto}>
                            {nome.trim()
                                ? nome.trim().charAt(0).toUpperCase()
                                : '?'}
                        </Text>

                    </View>


                    <View style={styles.informacoesPerfil}>

                        <Text style={styles.nomePreview}>
                            {nome.trim() || 'Seu nome'}
                        </Text>

                        <Text style={styles.usernamePreview}>
                            @{username.trim() || 'seu_usuario'}
                        </Text>

                    </View>


                    <View style={styles.seloPerfil}>

                        <Text style={styles.seloTexto}>
                            PERFIL
                        </Text>

                    </View>

                </View>


                {/* FORMULÁRIO */}

                <View style={styles.cartaoFormulario}>

                    <View style={styles.formularioCabecalho}>

                        <Text style={styles.formularioTitulo}>
                            Informações pessoais
                        </Text>

                        <Text style={styles.formularioDescricao}>
                            Esses dados aparecem no seu perfil.
                        </Text>

                    </View>


                    {/* NOME */}

                    <View style={styles.campo}>

                        <Text style={styles.label}>
                            Nome completo
                        </Text>

                        <TextInput
                            style={styles.input}
                            value={nome}
                            onChangeText={setNome}
                            placeholder="Como devemos chamar você?"
                            placeholderTextColor={CORES.secundario}
                            maxLength={60}
                        />

                    </View>


                    {/* USERNAME */}

                    <View style={styles.campo}>

                        <Text style={styles.label}>
                            Nome de usuário
                        </Text>

                        <View style={styles.inputUsername}>

                            <Text style={styles.arroba}>
                                @
                            </Text>

                            <TextInput
                                style={styles.usernameInput}
                                value={username}
                                onChangeText={setUsername}
                                placeholder="seu_usuario"
                                placeholderTextColor={CORES.secundario}
                                autoCapitalize="none"
                                autoCorrect={false}
                                maxLength={30}
                            />

                        </View>

                        <Text style={styles.dica}>
                            Use letras, números ou underline.
                        </Text>

                    </View>


                    {/* BIOGRAFIA */}

                    <View style={styles.campo}>

                        <Text style={styles.label}>
                            Biografia
                        </Text>

                        <TextInput
                            style={styles.bioInput}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Conte um pouco sobre você..."
                            placeholderTextColor={CORES.secundario}
                            multiline
                            maxLength={160}
                            textAlignVertical="top"
                        />

                        <Text style={styles.contador}>
                            {bio.length}/160 caracteres
                        </Text>

                    </View>

                </View>


                {/* BOTÃO SALVAR */}

                <TouchableOpacity
                    style={[
                        styles.botaoSalvar,
                        salvando && styles.botaoDesativado
                    ]}
                    onPress={handleSalvar}
                    disabled={salvando}
                    activeOpacity={0.85}
                >

                    {salvando ? (

                        <ActivityIndicator
                            color={CORES.branco}
                        />

                    ) : (

                        <>

                            <Text style={styles.textoBotao}>
                                Salvar alterações
                            </Text>

                            <Text style={styles.iconeBotao}>
                                →
                            </Text>

                        </>

                    )}

                </TouchableOpacity>


                <Text style={styles.aviso}>
                    Suas informações poderão ser atualizadas novamente quando quiser.
                </Text>

            </ScrollView>

        </View>

    );

}


// ESTILOS

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: CORES.fundo
    },


    // Cabeçalho

    header: {
        height: 62,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        alignItems: 'center',
        justifyContent: 'center'
    },

    iconeVoltar: {
        fontSize: 32,
        color: CORES.texto,
        lineHeight: 35
    },

    titulo: {
        fontSize: 17,
        fontWeight: '700',
        color: CORES.texto
    },

    headerEspaco: {
        width: 40
    },


    // Conteúdo

    conteudo: {
        paddingHorizontal: 20,
        paddingTop: 25,
        paddingBottom: 40
    },

    introducao: {
        marginBottom: 22
    },

    tituloSecao: {
        fontSize: 23,
        fontWeight: '700',
        color: CORES.texto
    },

    subtitulo: {
        fontSize: 13,
        lineHeight: 20,
        color: CORES.secundario,
        marginTop: 7
    },


    // Prévia do perfil

    cartaoPerfil: {
        backgroundColor: CORES.cartaoSecundario,
        borderRadius: 20,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    avatar: {
        width: 57,
        height: 57,
        borderRadius: 20,
        backgroundColor: CORES.destaqueEscuro,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: CORES.destaque
    },

    avatarTexto: {
        fontSize: 24,
        fontWeight: '700',
        color: CORES.branco
    },

    informacoesPerfil: {
        flex: 1,
        marginLeft: 13
    },

    nomePreview: {
        fontSize: 16,
        fontWeight: '700',
        color: CORES.texto
    },

    usernamePreview: {
        fontSize: 12,
        color: CORES.secundario,
        marginTop: 4
    },

    seloPerfil: {
        backgroundColor: '#B66AE825',
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#B66AE840'
    },

    seloTexto: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
        color: CORES.destaque
    },


    // Formulário

    cartaoFormulario: {
        backgroundColor: CORES.cartao,
        borderRadius: 20,
        padding: 19,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    formularioCabecalho: {
        marginBottom: 10
    },

    formularioTitulo: {
        fontSize: 17,
        fontWeight: '700',
        color: CORES.texto
    },

    formularioDescricao: {
        fontSize: 12,
        color: CORES.secundario,
        marginTop: 5
    },

    campo: {
        marginTop: 20
    },

    label: {
        fontSize: 13,
        fontWeight: '700',
        color: CORES.texto,
        marginBottom: 9
    },

    input: {
        backgroundColor: CORES.fundo,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontSize: 14,
        color: CORES.texto,
        borderWidth: 1,
        borderColor: CORES.borda
    },


    // Username

    inputUsername: {
        height: 49,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CORES.fundo,
        borderRadius: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    arroba: {
        fontSize: 16,
        fontWeight: '700',
        color: CORES.destaque,
        marginRight: 5
    },

    usernameInput: {
        flex: 1,
        height: '100%',
        fontSize: 14,
        color: CORES.texto
    },

    dica: {
        fontSize: 11,
        color: CORES.secundario,
        marginTop: 7
    },


    // Biografia

    bioInput: {
        height: 115,
        backgroundColor: CORES.fundo,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
        fontSize: 14,
        color: CORES.texto,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    contador: {
        textAlign: 'right',
        color: CORES.secundario,
        fontSize: 11,
        marginTop: 7
    },


    // Botão

    botaoSalvar: {
        backgroundColor: CORES.destaqueEscuro,
        paddingHorizontal: 20,
        height: 54,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24
    },

    botaoDesativado: {
        opacity: 0.6
    },

    textoBotao: {
        color: CORES.branco,
        fontSize: 14,
        fontWeight: '700'
    },

    iconeBotao: {
        color: CORES.branco,
        fontSize: 20,
        marginLeft: 10
    },

    aviso: {
        textAlign: 'center',
        fontSize: 11,
        lineHeight: 17,
        color: CORES.secundario,
        marginTop: 17,
        paddingHorizontal: 15
    }

});